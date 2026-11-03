import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculations';

const STORAGE_KEY = 'camBalkonProDraft';
const WING_KEY = 'camBalkonProWingSettings';

const initial = {
  customer: '',
  project: '',
  width: '1000',
  height: '1650',
  panels: '4',
  price: '3500',
  installation: '0',
  transport: '0',
  other: '0',
  discount: '0',
  vat: '20',
};

const directions = [
  { value: 'right', label: 'Sağa Açılır' },
  { value: 'left', label: 'Sola Açılır' },
  { value: 'fixed', label: 'Sabit' },
];

const holeTypes = ['Yok', 'D1', 'D2', 'D1+D2'];

function defaultWing(index) {
  const defaults = [
    { direction: 'right', holeType: 'D1' },
    { direction: 'right', holeType: 'Yok' },
    { direction: 'right', holeType: 'Yok' },
    { direction: 'fixed', holeType: 'D2' },
  ];

  const selected = defaults[index] || {
    direction: 'right',
    holeType: 'Yok',
  };

  return {
    direction: selected.direction,
    holeType: selected.holeType,
    D1: {
      diameter: '20',
      x: '80',
      y: '150',
    },
    D2: {
      diameter: '20',
      x: '80',
      y: '150',
    },
  };
}

function format(value, digits = 2) {
  const n = Number(value);

  return (Number.isFinite(n) ? n : 0).toLocaleString(
    'tr-TR',
    {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }
  );
}

function toNumber(value) {
  const n = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
}

function Field({
  label,
  value,
  onChangeText,
  textMode = false,
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        value={String(value ?? '')}
        onChangeText={onChangeText}
        keyboardType={
          textMode ? 'default' : 'decimal-pad'
        }
        placeholder={textMode ? 'Bilgi giriniz' : '0'}
      />
    </View>
  );
}

function ChoiceRow({
  title,
  options,
  value,
  onChange,
}) {
  return (
    <View style={styles.choiceSection}>
      <Text style={styles.label}>{title}</Text>

      <View style={styles.choiceWrap}>
        {options.map(option => {
          const selected = option.value === value;

          return (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[
                styles.choice,
                selected && styles.choiceSelected,
              ]}
            >
              <Text
                style={[
                  styles.choiceText,
                  selected && styles.choiceTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function selectedHoles(wing) {
  if (!wing) return [];

  if (wing.holeType === 'D1+D2') {
    return ['D1', 'D2'];
  }

  if (
    wing.holeType === 'D1' ||
    wing.holeType === 'D2'
  ) {
    return [wing.holeType];
  }

  return [];
}

function checkHole(hole, width, height) {
  const diameter = toNumber(hole.diameter);
  const x = toNumber(hole.x);
  const y = toNumber(hole.y);

  if (
    !Number.isFinite(diameter) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return false;
  }

  if (diameter <= 0) return false;

  const radius = diameter / 2;

  return (
    x >= radius &&
    y >= radius &&
    x <= width - radius &&
    y <= height - radius
  );
}

function HoleEditor({
  name,
  hole,
  onChange,
  glassWidth,
  glassHeight,
}) {
  const valid = checkHole(
    hole,
    glassWidth,
    glassHeight
  );

  return (
    <View style={styles.holeEditor}>
      <Text style={styles.holeTitle}>
        {name} Delik Ayarları
      </Text>

      <Field
        label="Delik Çapı (mm)"
        value={hole.diameter}
        onChangeText={value =>
          onChange('diameter', value)
        }
      />

      <Field
        label="Soldan Delik Merkezi (mm)"
        value={hole.x}
        onChangeText={value =>
          onChange('x', value)
        }
      />

      <Field
        label="Üstten Delik Merkezi (mm)"
        value={hole.y}
        onChangeText={value =>
          onChange('y', value)
        }
      />

      <Text
        style={
          valid ? styles.successText : styles.error
        }
      >
        {valid
          ? 'Delik konumu cam sınırları içerisinde.'
          : 'Uyarı: Delik ölçüsü veya konumu cam sınırları dışında.'}
      </Text>
    </View>
  );
}

function WingEditor({
  wing,
  index,
  onDirection,
  onHoleType,
  onHoleChange,
  glassWidth,
  glassHeight,
}) {
  const activeHoles = selectedHoles(wing);

  return (
    <View style={styles.wingCard}>
      <Text style={styles.wingTitle}>
        {index + 1}. Cam Kanadı
      </Text>

      <ChoiceRow
        title="Kanat Açılma Yönü"
        value={wing.direction}
        onChange={onDirection}
        options={directions}
      />

      <ChoiceRow
        title="Cam Delik Tipi"
        value={wing.holeType}
        onChange={onHoleType}
        options={holeTypes.map(type => ({
          value: type,
          label: type === 'Yok'
            ? 'Delik Yok'
            : type,
        }))}
      />

      {activeHoles.map(name => (
        <HoleEditor
          key={name}
          name={name}
          hole={wing[name]}
          glassWidth={glassWidth}
          glassHeight={glassHeight}
          onChange={(key, value) =>
            onHoleChange(name, key, value)
          }
        />
      ))}
    </View>
  );
}

function directionSymbol(direction) {
  if (direction === 'left') return '←';
  if (direction === 'fixed') return 'SABİT';
  return '→';
}

function PanelDrawing({ calc, wings }) {
  const count = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(calc.panels) || 1)
    )
  );

  const glassWidth = Number(calc.netWidth) || 0;
  const glassHeight = Number(calc.netHeight) || 0;

  const drawingHeight = 190;

  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Cam Balkon Panel Çizimi
      </Text>

      <Text style={styles.note}>
        Kanat yönleri ve delik konumları manuel
        ayarlanabilir. Çizim şematiktir.
      </Text>

      <View style={styles.dimensionTop}>
        <Text style={styles.dimensionText}>
          ← {format(calc.width, 0)} mm →
        </Text>
      </View>

      <View style={styles.drawing}>
        <View style={styles.caseBar}>
          <Text style={styles.caseText}>
            ÜST KASA
          </Text>
        </View>

        <View
          style={[
            styles.panelRow,
            { height: drawingHeight },
          ]}
        >
          {Array.from(
            { length: count },
            (_, index) => {
              const wing =
                wings[index] || defaultWing(index);

              const holes = selectedHoles(wing);

              return (
                <View
                  key={index}
                  style={[
                    styles.panel,
                    {
                      borderRightWidth:
                        index === count - 1
                          ? 0
                          : 1,
                    },
                  ]}
                >
                  <View style={styles.glassRail} />

                  <View
                    style={[
                      styles.glass,
                      {
                        backgroundColor:
                          index % 2 === 0
                            ? '#DCEFF8'
                            : '#C7E5F5',
                      },
                    ]}
                  >
                    {count <= 12 && (
                      <>
                        <Text
                          style={styles.panelNumber}
                        >
                          {index + 1}
                        </Text>

                        <Text
                          style={styles.directionText}
                        >
                          {directionSymbol(
                            wing.direction
                          )}
                        </Text>
                      </>
                    )}

                    {holes.map(name => {
                      const hole = wing[name];

                      if (
                        !checkHole(
                          hole,
                          glassWidth,
                          glassHeight
                        )
                      ) {
                        return null;
                      }

                      const x =
                        toNumber(hole.x) /
                        glassWidth;

                      const y =
                        toNumber(hole.y) /
                        glassHeight;

                      const diameter =
                        toNumber(hole.diameter);

                      const radius =
                        Math.max(
                          3,
                          Math.min(
                            8,
                            (diameter /
                              glassWidth) *
                              45
                          )
                        );

                      return (
                        <View
                          key={name}
                          style={[
                            styles.holeDot,
                            {
                              left:
                                `${x * 100}%`,
                              top:
                                `${y * 100}%`,
                              width:
                                radius * 2,
                              height:
                                radius * 2,
                              borderRadius:
                                radius,
                              marginLeft:
                                -radius,
                              marginTop:
                                -radius,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>

                  <View style={styles.glassRail} />
                </View>
              );
            }
          )}
        </View>

        <View style={styles.caseBar}>
          <Text style={styles.caseText}>
            ALT KASA
          </Text>
        </View>
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
        Kırmızı halkalar delik merkezlerini temsil
        eder. Delik ölçüleri aşağıdaki kanat
        ayarlarından değiştirilebilir.
      </Text>
    </View>
  );
}

function WingSettings({
  calc,
  wings,
  updateWing,
  updateHole,
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Kanat Yönleri ve Cam Delikleri
      </Text>

      <Text style={styles.note}>
        Her kanat için açılma yönünü, delik
        tipini ve delik merkezinin konumunu
        ayrı ayrı belirleyebilirsiniz.
      </Text>

      {wings.map((wing, index) => (
        <WingEditor
          key={index}
          index={index}
          wing={wing}
          glassWidth={Number(calc.netWidth)}
          glassHeight={Number(calc.netHeight)}
          onDirection={value =>
            updateWing(
              index,
              'direction',
              value
            )
          }
          onHoleType={value =>
            updateWing(
              index,
              'holeType',
              value
            )
          }
          onHoleChange={(name, key, value) =>
            updateHole(
              index,
              name,
              key,
              value
            )
          }
        />
      ))}
    </View>
  );
}

export default function App() {
  const [data, setData] = useState(initial);

  const [wings, setWings] = useState(
    Array.from(
      { length: 4 },
      (_, index) => defaultWing(index)
    )
  );

  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadDraft() {
      try {
        const saved = await AsyncStorage.getItem(
          STORAGE_KEY
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            const allowed = Object.keys(initial);

            const savedData = Object.fromEntries(
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
          await AsyncStorage.getItem(WING_KEY);

        if (savedWings) {
          const parsedWings =
            JSON.parse(savedWings);

          if (Array.isArray(parsedWings)) {
            setWings(parsedWings);
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
      WING_KEY,
      JSON.stringify(wings)
    ).catch(error => {
      console.warn(
        'Kanat ayarlari kaydedilemedi:',
        error
      );
    });
  }, [wings, loaded]);

  const set = key => value => {
    setData(previous => ({
      ...previous,
      [key]: value,
    }));
  };

  const calc = useMemo(
    () => calculate(data),
    [data]
  );

  const panelCount = Math.max(
    1,
    Math.min(
      100,
      Math.floor(
        Number(calc.panels) || 1
      )
    )
  );

  useEffect(() => {
    if (!loaded) return;

    setWings(previous => {
      if (previous.length === panelCount) {
        return previous;
      }

      return Array.from(
        { length: panelCount },
        (_, index) =>
          previous[index] ||
          defaultWing(index)
      );
    });
  }, [panelCount, loaded]);

  const updateWing = (
    index,
    key,
    value
  ) => {
    setWings(previous =>
      previous.map((wing, i) =>
        i === index
          ? {
              ...wing,
              [key]: value,
            }
          : wing
      )
    );
  };

  const updateHole = (
    index,
    name,
    key,
    value
  ) => {
    setWings(previous =>
      previous.map((wing, i) => {
        if (i !== index) {
          return wing;
        }

        return {
          ...wing,
          [name]: {
            ...wing[name],
            [key]: value,
          },
        };
      })
    );
  };

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
          Cam kesim, kanat yönleri,
          delik konumları ve fiyat hesabı
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
              ve panel adedini
              kontrol edin.
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
              updateHole={updateHole}
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
              'Müşteri, ölçü, kanat yönü ve delik ayarları otomatik olarak cihazda saklanıyor.'
            )
          }
        >
          <Text style={styles.buttonText}>
            Taslağı Kaydet
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Kesim ve delik ölçüleri
          gerçek imalat öncesinde
          kontrol edilmelidir.
          Deliklerin kenar mesafeleri
          kullanılan bağlantı
          elemanının teknik
          gerekliliklerine uygun olmalıdır.
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
  },

  successText: {
    color: '#18794E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
  },

  drawing: {
    borderWidth: 2,
    borderColor: '#34566B',
    marginTop: 8,
    marginBottom: 12,
    overflow: 'hidden',
  },

  dimensionTop: {
    alignItems: 'center',
    marginTop: 10,
  },

  dimensionText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#275B7A',
  },

  caseBar: {
    height: 17,
    backgroundColor: '#8597A4',
    borderBottomWidth: 1,
    borderBottomColor: '#536D7C',
    justifyContent: 'center',
    alignItems: 'center',
  },

  caseText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },

  panelRow: {
    flexDirection: 'row',
  },

  panel: {
    flex: 1,
    minWidth: 0,
    borderRightColor: '#547083',
  },

  glassRail: {
    height: 7,
    backgroundColor: '#A8B7C1',
  },

  glass: {
    flex: 1,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  panelNumber: {
    color: '#174769',
    fontWeight: '800',
    fontSize: 13,
  },

  directionText: {
    color: '#D87924',
    fontWeight: '900',
    fontSize: 16,
    marginTop: 8,
  },

  holeDot: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#C0392B',
    backgroundColor: '#FFFFFF',
  },

  wingCard: {
    marginTop: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#DDE6EE',
    borderRadius: 12,
    backgroundColor: '#FBFDFF',
  },

  wingTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#173D59',
    marginBottom: 10,
  },

  choiceSection: {
    marginBottom: 12,
  },

  choiceWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 5,
  },

  choice: {
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: '#C6D6E2',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },

  choiceSelected: {
    backgroundColor: '#205E85',
    borderColor: '#205E85',
  },

  choiceText: {
    color: '#35566C',
    fontSize: 12,
    fontWeight: '700',
  },

  choiceTextSelected: {
    color: '#FFFFFF',
  },

  holeEditor: {
    backgroundColor: '#F0F6FA',
    borderRadius: 10,
    padding: 11,
    marginTop: 8,
  },

  holeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#205E85',
    marginBottom: 10,
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
});
