import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  SafeAreaView,
  PanResponder,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculations';

const STORAGE_KEY = 'camBalkonProDraft';
const WING_KEY = 'camBalkonProWings';
const OLD_WING_KEY = 'camBalkonProWingSettings';

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

function defaultWing(index) {
  return {
    direction: index === 3 ? 'Sabit' : 'Sağ',
    holeType:
      index === 0 ? 'D1' : index === 3 ? 'D2' : 'Yok',
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

function normalizeWing(wing, index) {
  const base = defaultWing(index);

  if (!wing || typeof wing !== 'object') {
    return base;
  }

  const directionMap = {
    right: 'Sağ',
    left: 'Sol',
    fixed: 'Sabit',
  };

  const direction =
    directionMap[wing.direction] || wing.direction;

  const legacyHole =
    wing.diameter !== undefined
      ? {
          diameter: String(wing.diameter),
          x: String(wing.x ?? '80'),
          y: String(wing.y ?? '150'),
        }
      : {};

  return {
    ...base,
    direction: ['Sağ', 'Sol', 'Sabit'].includes(direction)
      ? direction
      : base.direction,
    holeType: ['Yok', 'D1', 'D2', 'D1+D2'].includes(
      wing.holeType
    )
      ? wing.holeType
      : base.holeType,
    D1: {
      ...base.D1,
      ...legacyHole,
      ...(wing.D1 || {}),
    },
    D2: {
      ...base.D2,
      ...legacyHole,
      ...(wing.D2 || {}),
    },
  };
}

function numberValue(value) {
  const text = String(value ?? '').trim().replace(',', '.');

  if (!text) return NaN;

  const n = Number(text);
  return Number.isFinite(n) ? n : NaN;
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
        keyboardType={textMode ? 'default' : 'decimal-pad'}
        placeholder={textMode ? 'Bilgi giriniz' : '0'}
      />
    </View>
  );
}

function OptionPicker({
  label,
  value,
  options,
  onChange,
}) {
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

function activeHoles(wing) {
  if (wing.holeType === 'D1+D2') {
    return ['D1', 'D2'];
  }

  if (wing.holeType === 'D1') {
    return ['D1'];
  }

  if (wing.holeType === 'D2') {
    return ['D2'];
  }

  return [];
}

function isHoleValid(hole, glassWidth, glassHeight) {
  if (!hole) return false;

  const diameter = numberValue(hole.diameter);
  const x = numberValue(hole.x);
  const y = numberValue(hole.y);

  if (
    !Number.isFinite(diameter) ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    diameter <= 0 ||
    glassWidth <= 0 ||
    glassHeight <= 0
  ) {
    return false;
  }

  const radius = diameter / 2;

  return (
    x >= radius &&
    x <= glassWidth - radius &&
    y >= radius &&
    y <= glassHeight - radius
  );
}

function HoleEditor({
  name,
  hole,
  glassWidth,
  glassHeight,
  onChange,
}) {
  const valid = isHoleValid(
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
          ? 'Delik cam sınırları içerisinde.'
          : 'Uyarı: Delik ölçüsü veya konumu geçersiz.'}
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
        Her kanadın yönünü ve deliklerini
        ayrı ayrı ayarlayabilirsiniz.
        Delik mesafeleri camın sol ve üst
        kenarından delik merkezine ölçülür.
      </Text>

      {wings.map((wing, index) => (
        <View
          key={index}
          style={styles.wingCard}
        >
          <Text style={styles.wingTitle}>
            {index + 1}. Cam Kanadı
          </Text>

          <OptionPicker
            label="Kanat Yönü"
            value={wing.direction}
            options={['Sağ', 'Sol', 'Sabit']}
            onChange={value =>
              updateWing(index, 'direction', value)
            }
          />

          <OptionPicker
            label="Cam Delik Tipi"
            value={wing.holeType}
            options={['Yok', 'D1', 'D2', 'D1+D2']}
            onChange={value =>
              updateWing(index, 'holeType', value)
            }
          />

          {activeHoles(wing).map(name => (
            <HoleEditor
              key={name}
              name={name}
              hole={wing[name]}
              glassWidth={Number(calc.netWidth)}
              glassHeight={Number(calc.netHeight)}
              onChange={(key, value) =>
                updateHole(index, name, key, value)
              }
            />
          ))}
        </View>
      ))}
    </View>
  );
}

function MotionSlider({
  value,
  onChange,
}) {
  const [width, setWidth] = useState(1);

  const valueRef = useRef(value);
  const widthRef = useRef(width);
  const changeRef = useRef(onChange);
  const dragStartRef = useRef(0);

  valueRef.current = value;
  widthRef.current = width;
  changeRef.current = onChange;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,

      onPanResponderTerminationRequest: () => false,

      onPanResponderGrant: () => {
        dragStartRef.current = valueRef.current;
      },

      onPanResponderMove: (_event, gesture) => {
        const next =
          dragStartRef.current +
          (gesture.dx / Math.max(1, widthRef.current)) * 100;

        const rounded = clamp(
          Math.round(next),
          0,
          100
        );

        if (rounded !== valueRef.current) {
          valueRef.current = rounded;
          changeRef.current(rounded);
        }
      },
    })
  ).current;

  return (
    <View
      style={styles.motionSliderTouch}
      onLayout={event => {
        const nextWidth = Math.max(
          1,
          event.nativeEvent.layout.width
        );

        widthRef.current = nextWidth;
        setWidth(nextWidth);
      }}
      {...responder.panHandlers}
    >
      <View style={styles.motionSliderTrack}>
        <View
          style={[
            styles.motionSliderFill,
            { width: `${value}%` },
          ]}
        />
      </View>

      <View
        style={[
          styles.motionSliderThumb,
          { left: `${value}%` },
        ]}
      />
    </View>
  );
}

function PanelDrawing({ calc, wings }) {
  const [progress, setProgress] = useState(0);
  const [stackSide, setStackSide] = useState('Sağ');

  const count = Math.max(
    1,
    Math.min(100, Math.floor(Number(calc.panels) || 1))
  );

  const glassWidth = Number(calc.netWidth) || 0;
  const glassHeight = Number(calc.netHeight) || 0;
  const panelWidth = 100 / count;

  const movingIndexes = [];

  for (let i = 0; i < count; i++) {
    const wing = wings[i] || defaultWing(i);

    if (wing.direction !== 'Sabit') {
      movingIndexes.push(i);
    }
  }

  if (stackSide === 'Sağ') {
    movingIndexes.reverse();
  }

  const movingCount = movingIndexes.length;

  // YARI AÇ DÜZELTMESİ
  // Tek sayılı hareketli kanatlarda yukarı yuvarlar.
  // Örneğin 5 kanatta 3, 7 kanatta 4 kanat toplanır.
  const halfOpen = () => {
    if (movingCount === 0) {
      setProgress(0);
      return;
    }

    const halfPanels = Math.ceil(movingCount / 2);
    const halfProgress =
      (halfPanels / movingCount) * 100;

    setProgress(halfProgress);
  };

  const panels = Array.from(
    { length: count },
    (_, index) => {
      const wing = wings[index] || defaultWing(index);

      const sequence = movingIndexes.indexOf(index);
      const moving = sequence >= 0;

      const phase =
        moving && movingCount > 0
          ? clamp(
              (progress / 100) * movingCount - sequence,
              0,
              1
            )
          : 0;

      const closedLeft = index * panelWidth;

      const foldedWidth = Math.min(
        panelWidth,
        Math.max(0.7, Math.min(2.1, 85 / count))
      );

      const targetLeft =
        stackSide === 'Sağ'
          ? 100 - (count - index) * foldedWidth
          : index * foldedWidth;

      return {
        index,
        wing,
        phase,
        left:
          closedLeft +
          (targetLeft - closedLeft) * phase,
        width:
          panelWidth +
          (foldedWidth - panelWidth) * phase,
      };
    }
  );

  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Hareketli Cam Balkon Ön Görünüşü
      </Text>

      <Text style={styles.note}>
        Camlar seçilen tarafta sırayla
        üst üste toplanır. Sabit kanatlar
        yerinde kalır.
      </Text>

      <OptionPicker
        label="Camların Toplanma Tarafı"
        value={stackSide}
        options={['Sağ', 'Sol']}
        onChange={setStackSide}
      />

      <Text style={styles.value}>
        Açılma Oranı: %{format(progress, 1)}
      </Text>

      <View style={styles.motionFrame}>
        <View style={styles.motionCase}>
          <Text style={styles.caseBarText}>
            ÜST KASA · 60 mm
          </Text>
        </View>

        <View style={styles.motionArea}>
          {panels.map(panel => {
            const { index, wing, phase } = panel;
            const holes = activeHoles(wing);

            return (
              <View
                key={index}
                style={[
                  styles.motionPanel,
                  {
                    left: `${panel.left}%`,
                    width: `${Math.max(
                      0.5,
                      panel.width
                    )}%`,
                    zIndex: phase > 0 ? index + 2 : 1,
                    backgroundColor:
                      index % 2 === 0
                        ? '#D8EEF9'
                        : '#C8E6F5',
                  },
                ]}
              >
                <View
                  style={styles.motionWingProfile}
                />

                <View style={styles.motionGlass}>
                  {phase < 0.65 && count <= 12 && (
                    <>
                      <Text style={styles.panelNumber}>
                        {index + 1}
                      </Text>

                      <Text
                        style={styles.directionArrow}
                      >
                        {wing.direction === 'Sağ'
                          ? '→'
                          : wing.direction === 'Sol'
                          ? '←'
                          : 'S'}
                      </Text>
                    </>
                  )}

                  {phase < 0.75 &&
                    holes.map(name => {
                      const hole = wing[name];

                      if (
                        !isHoleValid(
                          hole,
                          glassWidth,
                          glassHeight
                        )
                      ) {
                        return null;
                      }

                      const x =
                        numberValue(hole.x) /
                        glassWidth;

                      const y =
                        numberValue(hole.y) /
                        glassHeight;

                      return (
                        <View
                          key={name}
                          style={[
                            styles.holeMark,
                            {
                              left: `${x * 100}%`,
                              top: `${y * 100}%`,
                            },
                          ]}
                        />
                      );
                    })}
                </View>

                <View
                  style={styles.motionWingProfile}
                />
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
        Üst ve alt kanat profili: 45 mm.
        Sağ ve sol sabit yan profil: 40 mm.
      </Text>

      <Text style={styles.label}>
        Hareketi Kaydırarak Ayarlayın
      </Text>

      <MotionSlider
        value={progress}
        onChange={setProgress}
      />

      <View style={styles.fineAdjustRow}>
        <Pressable
          style={styles.fineAdjustButton}
          onPress={() =>
            setProgress(previous =>
              clamp(previous - 1, 0, 100)
            )
          }
        >
          <Text style={styles.fineAdjustText}>
            −1
          </Text>
        </Pressable>

        <Text style={styles.fineAdjustValue}>
          %{format(progress, 1)}
        </Text>

        <Pressable
          style={styles.fineAdjustButton}
          onPress={() =>
            setProgress(previous =>
              clamp(previous + 1, 0, 100)
            )
          }
        >
          <Text style={styles.fineAdjustText}>
            +1
          </Text>
        </Pressable>
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
            onPress={
              label === 'Yarı Aç'
                ? halfOpen
                : () => setProgress(value)
            }
          >
            <Text style={styles.motionButtonText}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.value}>
        Toplam Genişlik:{' '}
        {format(calc.width, 0)} mm
      </Text>

      <Text style={styles.value}>
        Toplam Yükseklik:{' '}
        {format(calc.height, 0)} mm
      </Text>

      <Text style={styles.value}>
        Kanat Adedi: {calc.panels}
      </Text>

      <Text style={styles.value}>
        Net Cam: {format(calc.netWidth, 2)} ×{' '}
        {format(calc.netHeight, 1)} mm
      </Text>

      <Text style={styles.note}>
        Bu hareketli ön görünüş şematiktir.
        Gerçek ray ve dönme mekanizmasının
        fiziksel simülasyonu değildir.
      </Text>
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
          (await AsyncStorage.getItem(WING_KEY)) ||
          (await AsyncStorage.getItem(OLD_WING_KEY));

        if (savedWings) {
          const parsedWings = JSON.parse(savedWings);

          if (Array.isArray(parsedWings)) {
            setWings(
              parsedWings
                .slice(0, 100)
                .map((wing, index) =>
                  normalizeWing(wing, index)
                )
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
    ).catch(error =>
      console.warn(
        'Taslak kaydedilemedi:',
        error
      )
    );
  }, [data, loaded]);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      WING_KEY,
      JSON.stringify(wings)
    ).catch(error =>
      console.warn(
        'Kanat ayarlari kaydedilemedi:',
        error
      )
    );
  }, [wings, loaded]);

  const calc = useMemo(
    () => calculate(data),
    [data]
  );

  const panelCount = Math.max(
    1,
    Math.min(
      100,
      Math.floor(Number(calc.panels) || 1)
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
          previous[index] || defaultWing(index)
      );
    });
  }, [panelCount, loaded]);

  const set = key => value => {
    setData(previous => ({
      ...previous,
      [key]: value,
    }));
  };

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
      previous.map((wing, i) =>
        i === index
          ? {
              ...wing,
              [name]: {
                ...wing[name],
                [key]: value,
              },
            }
          : wing
      )
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
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>
          CAM BALKON PRO
        </Text>

        <Text style={styles.title}>
          Katlanır Cam Balkon
        </Text>

        <Text style={styles.subtitle}>
          Cam kesim, hareketli ön görünüş,
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
              Panel Eni:{' '}
              {format(calc.panelWidth, 2)} mm
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Cam Kesim Listesi
          </Text>

          <Text style={styles.note}>
            Cam eni: (Genişlik - 25) /
            Panel adedi - 0,6 mm
          </Text>

          <Text style={styles.note}>
            Cam boyu: Yükseklik - 170 mm
          </Text>

          {calc.valid ? (
            <>
              <Text style={styles.total}>
                {format(calc.netWidth, 2)} ×{' '}
                {format(calc.netHeight, 1)} mm
              </Text>

              <Text style={styles.value}>
                Cam Adedi: {calc.panels}
              </Text>
            </>
          ) : (
            <Text style={styles.error}>
              Ölçüler geçersiz.
              Genişlik, yükseklik ve
              panel adedini kontrol edin.
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
            Toplam Alan: {format(calc.area)} m²
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
            Cam Balkon:{' '}
            {format(calc.material)} TL
          </Text>

          <Text style={styles.priceLine}>
            İskonto: -
            {format(calc.discount)} TL
          </Text>

          <Text style={styles.priceLine}>
            Ara Toplam:{' '}
            {format(calc.subtotal)} TL
          </Text>

          <Text style={styles.priceLine}>
            KDV: {format(calc.vat)} TL
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
          Delik çapı ve kenar mesafeleri
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

  successText: {
    color: '#18794E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 5,
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

  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginBottom: 10,
  },

  option: {
    borderWidth: 1,
    borderColor: '#C6D6E2',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
  },

  optionSelected: {
    backgroundColor: '#205E85',
    borderColor: '#205E85',
  },

  optionText: {
    color: '#35566C',
    fontWeight: '700',
    fontSize: 12,
  },

  optionTextSelected: {
    color: '#FFFFFF',
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

  motionFrame: {
    borderWidth: 2,
    borderColor: '#34566B',
    marginTop: 15,
    marginBottom: 12,
    overflow: 'hidden',
  },

  motionCase: {
    height: 18,
    backgroundColor: '#899AA8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  caseBarText: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '800',
  },

  motionArea: {
    height: 190,
    position: 'relative',
    backgroundColor: '#E9F4FA',
    overflow: 'hidden',
  },

  motionPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    borderWidth: 1,
    borderColor: '#397997',
    overflow: 'hidden',
  },

  motionWingProfile: {
    height: 10,
    backgroundColor: '#9EAFBB',
  },

  motionGlass: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  panelNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: '#235470',
  },

  directionArrow: {
    fontSize: 17,
    fontWeight: '900',
    color: '#E58A24',
    marginTop: 7,
  },

  holeMark: {
    position: 'absolute',
    width: 10,
    height: 10,
    marginLeft: -5,
    marginTop: -5,
    borderWidth: 2,
    borderColor: '#D03939',
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },

  motionSliderTouch: {
    height: 52,
    justifyContent: 'center',
    marginTop: 8,
    marginHorizontal: 12,
  },

  motionSliderTrack: {
    height: 8,
    backgroundColor: '#D5E2EC',
    borderRadius: 5,
    overflow: 'hidden',
  },

  motionSliderFill: {
    height: '100%',
    backgroundColor: '#205E85',
  },

  motionSliderThumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#205E85',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    marginLeft: -13,
    elevation: 3,
  },

  fineAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },

  fineAdjustButton: {
    backgroundColor: '#E4EFF6',
    borderWidth: 1,
    borderColor: '#B5CEDD',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 9,
  },

  fineAdjustText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#205E85',
  },

  fineAdjustValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#173D59',
    minWidth: 65,
    textAlign: 'center',
  },

  motionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
    marginBottom: 10,
  },

  motionButton: {
    flex: 1,
    backgroundColor: '#205E85',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderRadius: 9,
    alignItems: 'center',
  },

  motionButtonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
});
