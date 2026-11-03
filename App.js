import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert, ScrollView, View, Text, TextInput, Pressable,
  StyleSheet, SafeAreaView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculations';

const STORAGE_KEY = 'camBalkonProDraft';
const initial = {
  customer: '', project: '', width: '1000', height: '1650', panels: '4',
  price: '3500', installation: '0', transport: '0', other: '0',
  discount: '0', vat: '20',
};

const defaultWing = index => ({
  direction: index === 3 ? 'Sabit' : 'Sağ',
  holeType: index === 0 ? 'D1' : index === 3 ? 'D2' : 'Yok',
  diameter: '20', x: '80', y: '150',
});

function format(value, digits = 2) {
  const n = Number(value);
  return (Number.isFinite(n) ? n : 0).toLocaleString('tr-TR', {
    minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
}

function numeric(value) {
  return Number(String(value ?? '').trim().replace(',', '.'));
}

function Field({ label, value, onChangeText, textMode = false }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        keyboardType={textMode ? 'default' : 'decimal-pad'}
        placeholder={textMode ? 'Bilgi giriniz' : '0'}
      />
    </View>
  );
}

function OptionPicker({ label, value, options, onChange }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionRow}>
        {options.map(option => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            style={[
              styles.option,
              value === option && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                value === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function holeWarning(wing, glassWidth, glassHeight) {
  if (wing.holeType === 'Yok') return '';

  const d = numeric(wing.diameter);
  const x = numeric(wing.x);
  const y = numeric(wing.y);

  if (
    ![d, x, y].every(Number.isFinite) ||
    d <= 0 || x < 0 || y < 0
  ) {
    return 'Delik çapı ve merkez mesafelerini kontrol edin.';
  }

  if (
    x - d / 2 < 0 ||
    x + d / 2 > glassWidth ||
    y - d / 2 < 0 ||
    y + d / 2 > glassHeight
  ) {
    return 'Delik cam sınırlarının dışına taşıyor.';
  }

  return '';
}

function PanelDrawing({ calc, wings }) {
  const count = Math.max(
    1,
    Math.min(100, Math.floor(Number(calc.panels) || 1))
  );

  const [progress, setProgress] = useState(0);
  const [stackSide, setStackSide] = useState('Sağ');
  const [trackWidth, setTrackWidth] = useState(1);

  const glassWidth = Number(calc.netWidth) || 0;
  const glassHeight = Number(calc.netHeight) || 0;
  const panelWidth = 100 / count;

  // Kanatlar sırayla açılır.
  // Önden görünüşte daralarak üst üste toplanır.
  // Sabit kanatlar hareket etmez.
  const panels = Array.from({ length: count }, (_, index) => {
    const wing = wings[index] || defaultWing(index);

    const sequence =
      stackSide === 'Sağ' ? count - 1 - index : index;

    const phase = Math.max(
      0,
      Math.min(1, (progress / 100) * count - sequence)
    );

    const moving = wing.direction !== 'Sabit';
    const folded = moving ? phase : 0;

    const closedLeft = index * panelWidth;

    const targetLeft =
      stackSide === 'Sağ'
        ? 100 - (count - index) * 2.1
        : index * 2.1;

    return {
      index,
      wing,
      folded,
      left: closedLeft + (targetLeft - closedLeft) * folded,
      width: panelWidth + (2.1 - panelWidth) * folded,
    };
  });

  const setFromTouch = event => {
    const x = event.nativeEvent.locationX;

    setProgress(
      Math.max(
        0,
        Math.min(
          100,
          Math.round((x / trackWidth) * 100)
        )
      )
    );
  };

  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Hareketli Cam Balkon Ön Görünüşü
      </Text>

      <Text style={styles.note}>
        Camlar seçilen tarafta sırayla üst üste toplanır.
        Sabit kanatlar yerinde kalır.
      </Text>

      <View style={styles.optionRow}>
        {['Sağ', 'Sol'].map(side => (
          <Pressable
            key={side}
            onPress={() => setStackSide(side)}
            style={[
              styles.option,
              stackSide === side && styles.optionSelected,
            ]}
          >
            <Text
              style={[
                styles.optionText,
                stackSide === side && styles.optionTextSelected,
              ]}
            >
              {side} tarafta topla
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.value}>
        Açılma: %{progress}
      </Text>

      <View style={styles.motionFrame}>
        <View style={styles.motionCase}>
          <Text style={styles.caseBarText}>
            ÜST KASA · 60 mm
          </Text>
        </View>

        <View style={styles.motionArea}>
          {panels.map(p => {
            const { index, wing, folded } = p;

            const validHole =
              wing.holeType !== 'Yok' &&
              !holeWarning(
                wing,
                glassWidth,
                glassHeight
              );

            const x = numeric(wing.x);
            const y = numeric(wing.y);

            const holeLeft =
              glassWidth > 0
                ? Math.max(
                    0,
                    Math.min(100, (x / glassWidth) * 100)
                  )
                : 0;

            const holeTop =
              glassHeight > 0
                ? Math.max(
                    0,
                    Math.min(100, (y / glassHeight) * 100)
                  )
                : 0;

            return (
              <View
                key={index}
                style={[
                  styles.motionPanel,
                  {
                    left: `${p.left}%`,
                    width: `${Math.max(0.5, p.width)}%`,
                    zIndex: folded > 0 ? index + 2 : 1,
                    backgroundColor:
                      index % 2
                        ? '#C8E6F5'
                        : '#D8EEF9',
                  },
                ]}
              >
                <View style={styles.motionWingProfile} />

                <View style={styles.motionGlass}>
                  {folded < 0.65 && (
                    <>
                      <Text style={styles.panelNumber}>
                        {count <= 12 ? index + 1 : ''}
                      </Text>

                      <Text style={styles.directionArrow}>
                        {count <= 12
                          ? wing.direction === 'Sağ'
                            ? '→'
                            : wing.direction === 'Sol'
                              ? '←'
                              : 'S'
                          : ''}
                      </Text>
                    </>
                  )}

                  {validHole && folded < 0.75 && (
                    <View
                      style={[
                        styles.holeMark,
                        {
                          left: `${holeLeft}%`,
                          top: `${holeTop}%`,
                          width: 10,
                          height: 10,
                        },
                      ]}
                    />
                  )}
                </View>

                <View style={styles.motionWingProfile} />
              </View>
            );
          })}
        </View>

        <View style={styles.motionCase}>
          <Text style={styles.caseBarText}>
            ALT KASA · 60 mm
          </Text>
        </View>
      </View>

      <Text style={styles.note}>
        Cam üst/alt kanat profili: 45 mm.
        Sağ/sol sabit yan profil: 40 mm.
      </Text>

      <Text style={styles.label}>
        Hareketi parmağınızla ayarlayın
      </Text>

      <View
        style={styles.motionSliderTouch}
        onLayout={event =>
          setTrackWidth(
            Math.max(
              1,
              event.nativeEvent.layout.width
            )
          )
        }
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={setFromTouch}
        onResponderMove={setFromTouch}
      >
        <View style={styles.motionSliderTrack}>
          <View
            style={[
              styles.motionSliderFill,
              { width: `${progress}%` },
            ]}
          />
        </View>

        <View
          style={[
            styles.motionSliderThumb,
            { left: `${progress}%` },
          ]}
        />
      </View>

      <View style={styles.motionButtons}>
        {[
          ['Tam Kapat', 0],
          ['Yarı Aç', 50],
          ['Tam Aç', 100],
        ].map(([label, value]) => (
          <Pressable
            key={label}
            style={styles.motionButton}
            onPress={() => setProgress(value)}
          >
            <Text style={styles.motionButtonText}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.value}>
        Toplam genişlik: {format(calc.width, 0)} mm
      </Text>

      <Text style={styles.value}>
        Toplam yükseklik: {format(calc.height, 0)} mm
      </Text>

      <Text style={styles.value}>
        Kanat adedi: {calc.panels}
      </Text>

      <Text style={styles.value}>
        Net cam: {format(calc.netWidth, 2)} ×{' '}
        {format(calc.netHeight, 1)} mm
      </Text>

      <Text style={styles.note}>
        Bu çizim şematik bir hareketli ön görünüştür.
        Gerçek 3B dönme veya ray mekanizması hesaplanmaz.
        Kesim ölçüleri değiştirilmez.
      </Text>
    </View>
  );
}

function WingSettings({
  calc,
  wings,
  updateWing,
}) {
  const count = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(calc.panels) || 1)
    )
  );

  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Kanat Yönü ve Delik Ayarları
      </Text>

      <Text style={styles.note}>
        Delik konumu camın sol ve üst kenarından
        delik merkezine ölçülür (mm).
        D1 ve D2 delik isimleridir;
        çap ve konumları manuel girilir.
      </Text>

      {Array.from(
        { length: count },
        (_, index) => {
          const wing =
            wings[index] || defaultWing(index);

          const warning = holeWarning(
            wing,
            Number(calc.netWidth),
            Number(calc.netHeight)
          );

          return (
            <View
              key={index}
              style={styles.wingCard}
            >
              <Text style={styles.wingTitle}>
                {index + 1}. Kanat
              </Text>

              <OptionPicker
                label="Kanat yönü"
                value={wing.direction}
                options={[
                  'Sağ',
                  'Sol',
                  'Sabit',
                ]}
                onChange={value =>
                  updateWing(
                    index,
                    'direction',
                    value
                  )
                }
              />

              <OptionPicker
                label="Cam deliği"
                value={wing.holeType}
                options={[
                  'Yok',
                  'D1',
                  'D2',
                ]}
                onChange={value =>
                  updateWing(
                    index,
                    'holeType',
                    value
                  )
                }
              />

              {wing.holeType !== 'Yok' && (
                <>
                  <Field
                    label="Delik çapı (mm)"
                    value={wing.diameter}
                    onChangeText={value =>
                      updateWing(
                        index,
                        'diameter',
                        value
                      )
                    }
                  />

                  <Field
                    label="Soldan delik merkezi (mm)"
                    value={wing.x}
                    onChangeText={value =>
                      updateWing(
                        index,
                        'x',
                        value
                      )
                    }
                  />

                  <Field
                    label="Üstten delik merkezi (mm)"
                    value={wing.y}
                    onChangeText={value =>
                      updateWing(
                        index,
                        'y',
                        value
                      )
                    }
                  />

                  {!!warning && (
                    <Text style={styles.error}>
                      {warning}
                    </Text>
                  )}
                </>
              )}
            </View>
          );
        }
      )}
    </View>
  );
}

export default function App() {
  const [data, setData] = useState(initial);

  const [wings, setWings] = useState(
    Array.from(
      { length: 4 },
      (_, i) => defaultWing(i)
    )
  );

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadDraft() {
      try {
        const saved =
          await AsyncStorage.getItem(
            STORAGE_KEY
          );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            const allowed =
              Object.keys(initial);

            const savedData =
              Object.fromEntries(
                Object.entries(parsed).filter(
                  ([key]) => allowed.includes(key)
                )
              );

            setData({
              ...initial,
              ...savedData,
            });
          }
        }

        const savedWings =
          await AsyncStorage.getItem(
            'camBalkonProWings'
          );

        if (savedWings) {
          const parsedWings =
            JSON.parse(savedWings);

          if (Array.isArray(parsedWings)) {
            setWings(
              parsedWings
                .slice(0, 100)
                .map((wing, index) => ({
                  ...defaultWing(index),
                  ...(wing &&
                  typeof wing === 'object' &&
                  !Array.isArray(wing)
                    ? wing
                    : {}),
                }))
            );
          }
        }
      } catch (error) {
        console.warn(
          'Taslak okunamadi:',
          error
        );
      } finally {
        setLoaded(true);
      }
    }

    loadDraft();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    ).catch(error => {
      console.warn(
        'Taslak kaydedilemedi:',
        error
      );
    });
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      'camBalkonProWings',
      JSON.stringify(wings)
    ).catch(error => {
      console.warn(
        'Kanat ayarlari kaydedilemedi:',
        error
      );
    });
  }, [wings, loaded]);

  const set = key => value =>
    setData(previous => ({
      ...previous,
      [key]: value,
    }));

  const updateWing = (
    index,
    key,
    value
  ) => {
    setWings(previous => {
      const next = [...previous];

      while (next.length <= index) {
        next.push(
          defaultWing(next.length)
        );
      }

      next[index] = {
        ...next[index],
        [key]: value,
      };

      return next;
    });
  };

  const calc = useMemo(
    () => calculate(data),
    [data]
  );

  const field = (
    key,
    label,
    textMode = false
  ) => (
    <Field
      key={key}
      label={label}
      value={data[key]}
      onChangeText={set(key)}
      textMode={textMode}
    />
  );

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        contentContainerStyle={
          styles.content
        }
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>
          CAM BALKON PRO
        </Text>

        <Text style={styles.title}>
          Katlanır Cam Balkon
        </Text>

        <Text style={styles.subtitle}>
          Cam kesim, kanat yönü,
          delik ve fiyat hesaplama
        </Text>

        <View style={styles.card}>
          <Text style={styles.section}>
            Müşteri ve Proje
          </Text>

          {field(
            'customer',
            'Müşteri Adı',
            true
          )}

          {field(
            'project',
            'Proje / Uygulama Yeri',
            true
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Ölçüler (mm)
          </Text>

          {field(
            'width',
            'Toplam Genişlik (mm)'
          )}

          {field(
            'height',
            'Toplam Yükseklik (mm)'
          )}

          {field(
            'panels',
            'Panel Adedi'
          )}

          {calc.valid && (
            <Text style={styles.value}>
              Panel eni:{' '}
              {format(
                calc.panelWidth,
                2
              )} mm
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Cam Kesim Listesi
          </Text>

          <Text style={styles.note}>
            Cam eni: (Genişlik - 25)
            / Panel adedi - 0,6 mm
          </Text>

          <Text style={styles.note}>
            Cam boyu: Yükseklik - 170 mm
          </Text>

          {calc.valid ? (
            <>
              <Text style={styles.total}>
                {format(
                  calc.netWidth,
                  2
                )} ×{' '}
                {format(
                  calc.netHeight,
                  1
                )} mm
              </Text>

              <Text style={styles.value}>
                Cam adedi:{' '}
                {calc.panels}
              </Text>
            </>
          ) : (
            <Text style={styles.error}>
              Ölçüler geçersiz.
              Genişlik, yükseklik
              ve panel adedini kontrol edin.
            </Text>
          )}
        </View>

        {calc.valid && (
          <>
            <PanelDrawing
              calc={calc}
              wings={wings}
            />

            <WingSettings
              calc={calc}
              wings={wings}
              updateWing={updateWing}
            />
          </>
        )}

        <View style={styles.card}>
          <Text style={styles.section}>
            Teklif Hesabı
          </Text>

          <Text style={styles.value}>
            Toplam alan:{' '}
            {format(calc.area)} m²
          </Text>

          {field(
            'price',
            'Birim Fiyat (TL/m²)'
          )}

          {field(
            'installation',
            'Montaj (TL)'
          )}

          {field(
            'transport',
            'Nakliye (TL)'
          )}

          {field(
            'other',
            'Diğer (TL)'
          )}

          {field(
            'discount',
            'İskonto (%)'
          )}

          {field(
            'vat',
            'KDV (%)'
          )}

          <View style={styles.divider} />

          <Text style={styles.priceLine}>
            Cam balkon:{' '}
            {format(calc.material)} TL
          </Text>

          <Text style={styles.priceLine}>
            İskonto: -
            {format(calc.discount)} TL
          </Text>

          <Text style={styles.priceLine}>
            Ara toplam:{' '}
            {format(calc.subtotal)} TL
          </Text>

          <Text style={styles.priceLine}>
            KDV:{' '}
            {format(calc.vat)} TL
          </Text>

          <Text style={styles.total}>
            GENEL TOPLAM:{' '}
            {format(calc.total)} TL
          </Text>
        </View>

        <Pressable
          style={styles.button}
          onPress={() =>
            Alert.alert(
              'Taslak',
              'Bilgiler ve kanat ayarları otomatik olarak cihazda saklanıyor.'
            )
          }
        >
          <Text style={styles.buttonText}>
            Taslağı Kaydet
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Cam kesim ve delik ölçüleri
          imalat öncesinde kontrol edilmelidir.
          Delik çapı ve kenar mesafesi
          kullanılan bağlantı sistemine
          uygun olmalıdır.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F6FA',
  },

  content: {
    padding: 18,
    paddingBottom: 55,
  },

  brand: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#326D96',
  },

  title: {
    fontSize: 27,
    fontWeight: '800',
    color: '#14354D',
    marginTop: 5,
  },

  subtitle: {
    fontSize: 13,
    color: '#62788B',
    marginBottom: 16,
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 15,
    marginBottom: 13,
    borderWidth: 1,
    borderColor: '#E1E8EF',
  },

  section: {
    fontSize: 17,
    fontWeight: '800',
    color: '#173D59',
    marginBottom: 12,
  },

  field: {
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#536B7C',
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: '#CCD9E4',
    borderRadius: 9,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 15,
    color: '#12344D',
    backgroundColor: '#FBFDFF',
  },

  value: {
    fontWeight: '800',
    color: '#164F77',
    fontSize: 15,
    marginVertical: 8,
  },

  note: {
    color: '#697C8A',
    fontSize: 11,
    lineHeight: 18,
    marginTop: 8,
    marginBottom: 5,
  },

  error: {
    color: '#C0392B',
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 8,
  },

  divider: {
    height: 1,
    backgroundColor: '#E4EAF0',
    marginVertical: 12,
  },

  priceLine: {
    fontSize: 14,
    color: '#35566C',
    marginVertical: 5,
  },

  total: {
    fontSize: 19,
    fontWeight: '900',
    color: '#13633C',
    marginTop: 13,
  },

  button: {
    backgroundColor: '#205E85',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },

  motionFrame:
