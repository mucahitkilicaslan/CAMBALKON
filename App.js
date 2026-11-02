
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

function format(value, digits = 2) {
  const n = Number(value);

  return (Number.isFinite(n) ? n : 0).toLocaleString('tr-TR', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
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

function PanelDrawing({ calc }) {
  const count = Math.max(
    1,
    Math.min(100, Math.floor(Number(calc.panels) || 1))
  );

  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Cam Balkon Panel Çizimi
      </Text>

      <Text style={styles.note}>
        Önden görünüş - şematik çizim
      </Text>

      <View style={styles.drawing}>
        {Array.from({ length: count }, (_, index) => (
          <View
            key={index}
            style={[
              styles.glassPanel,
              {
                borderRightWidth: index === count - 1 ? 0 : 1,
                backgroundColor:
                  index % 2 === 0 ? '#D8EEF9' : '#C4E4F5',
              },
            ]}
          >
            {count <= 12 && (
              <Text
                style={[
                  styles.panelNumber,
                  { fontSize: count > 8 ? 10 : 15 },
                ]}
              >
                {index + 1}
              </Text>
            )}
          </View>
        ))}
      </View>

      <Text style={styles.value}>
        Toplam genişlik: {format(calc.width, 0)} mm
      </Text>

      <Text style={styles.value}>
        Toplam yükseklik: {format(calc.height, 0)} mm
      </Text>

      <Text style={styles.value}>
        Panel adedi: {count}
      </Text>

      <Text style={styles.value}>
        Panel eni: {format(calc.panelWidth, 2)} mm
      </Text>

      <Text style={styles.value}>
        Net cam kesimi: {format(calc.netWidth, 2)} ×{' '}
        {format(calc.netHeight, 1)} mm
      </Text>

      <Text style={styles.note}>
        Bu çizim şematiktir. Gerçek imalat öncesinde
        kullanılan sistemin teknik ölçülerini doğrulayın.
      </Text>
    </View>
  );
}

export default function App() {
  const [data, setData] = useState(initial);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadDraft() {
      try {
        const saved = await AsyncStorage.getItem(
          'camBalkonProDraft'
        );

        if (saved) {
          const parsed = JSON.parse(saved);

          if (
            parsed &&
            typeof parsed === 'object' &&
            !Array.isArray(parsed)
          ) {
            const {
              profileW,
              sealW,
              gapW,
              profileH,
              sealH,
              gapH,
              ...savedData
            } = parsed;

            setData({ ...initial, ...savedData });
          }
        }
      } catch (error) {
        console.warn('Taslak okunamadi:', error);
      } finally {
        setLoaded(true);
      }
    }

    loadDraft();
  }, []);

  useEffect(() => {
    if (!loaded) return;

    AsyncStorage.setItem(
      'camBalkonProDraft',
      JSON.stringify(data)
    ).catch(error => {
      console.warn('Taslak kaydedilemedi:', error);
    });
  }, [data, loaded]);

  const set = key => value => {
    setData(previous => ({
      ...previous,
      [key]: value,
    }));
  };

  const calc = useMemo(() => calculate(data), [data]);

  const field = (key, label, textMode = false) => (
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
        <Text style={styles.brand}>CAM BALKON PRO</Text>

        <Text style={styles.title}>
          Katlanır Cam Balkon
        </Text>

        <Text style={styles.subtitle}>
          Otomatik cam kesim ölçüleri ve fiyat teklifi
        </Text>

        <View style={styles.card}>
          <Text style={styles.section}>
            Müşteri ve Proje
          </Text>

          {field('customer', 'Müşteri Adı', true)}
          {field('project', 'Proje / Uygulama Yeri', true)}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Ölçüler (mm)
          </Text>

          {field('width', 'Toplam Genişlik (mm)')}
          {field('height', 'Toplam Yükseklik (mm)')}
          {field('panels', 'Panel Adedi')}

          <Text style={styles.value}>
            Kullanılabilir genişlik:{' '}
            {format(calc.usableWidth, 1)} mm
          </Text>

          <Text style={styles.value}>
            Panel eni: {format(calc.panelWidth, 2)} mm
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Otomatik Cam Kesim Ölçüleri
          </Text>

          <Text style={styles.subheading}>
            Cam eni hesabı
          </Text>

          <Text style={styles.note}>
            Toplam genişlikten 25 mm düşülür.
            Kalan ölçü panel adedine bölünür.
            Her panel eninden 0,6 mm düşülür.
          </Text>

          <Text style={styles.value}>
            Net cam eni: {format(calc.netWidth, 2)} mm
          </Text>

          <View style={styles.divider} />

          <Text style={styles.subheading}>
            Cam boyu hesabı
          </Text>

          <Text style={styles.note}>
            Toplam yükseklikten otomatik 170 mm
            (17 cm) düşülür.
          </Text>

          <Text style={styles.value}>
            Net cam boyu: {format(calc.netHeight, 1)} mm
          </Text>

          <View style={styles.divider} />

          {calc.valid ? (
            <Text style={styles.total}>
              NET CAM KESİMİ:{' '}
              {format(calc.netWidth, 2)} ×{' '}
              {format(calc.netHeight, 1)} mm
            </Text>
          ) : (
            <Text style={styles.error}>
              Ölçüler geçersiz. Toplam genişlik,
              yükseklik ve panel adedini kontrol edin.
            </Text>
          )}
        </View>

        <PanelDrawing calc={calc} />

        <View style={styles.card}>
          <Text style={styles.section}>
            Panel Bilgileri
          </Text>

          <Text style={styles.value}>
            Panel adedi: {calc.panels}
          </Text>

          <Text style={styles.value}>
            Panel eni: {format(calc.panelWidth, 2)} mm
          </Text>

          <Text style={styles.value}>
            Panel yüksekliği: {format(calc.height, 1)} mm
          </Text>

          <Text style={styles.value}>
            Net cam eni: {format(calc.netWidth, 2)} mm
          </Text>

          <Text style={styles.value}>
            Net cam boyu: {format(calc.netHeight, 1)} mm
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>
            Teklif Hesabı
          </Text>

          <Text style={styles.value}>
            Toplam alan: {format(calc.area)} m²
          </Text>

          {field('price', 'Birim Fiyat (TL/m²)')}
          {field('installation', 'Montaj (TL)')}
          {field('transport', 'Nakliye (TL)')}
          {field('other', 'Diğer (TL)')}
          {field('discount', 'İskonto (%)')}
          {field('vat', 'KDV (%)')}

          <View style={styles.divider} />

          <Text>
            Cam balkon: {format(calc.material)} TL
          </Text>

          <Text>
            İskonto: -{format(calc.discount)} TL
          </Text>

          <Text>
            Ara toplam: {format(calc.subtotal)} TL
          </Text>

          <Text>
            KDV: {format(calc.vat)} TL
          </Text>

          <Text style={styles.total}>
            GENEL TOPLAM: {format(calc.total)} TL
          </Text>
        </View>

        <Pressable
          style={styles.button}
          onPress={() =>
            Alert.alert(
              'Taslak',
              'Girdiğiniz bilgiler otomatik olarak cihazda saklanıyor.'
            )
          }
        >
          <Text style={styles.buttonText}>
            Taslağı Kaydet
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Cam eni ve cam boyu otomatik hesaplanır.
          İmalat öncesinde teknik kesim paylarını
          ve ölçüleri doğrulayın.
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

  subheading: {
    fontWeight: '700',
    color: '#35566C',
    marginBottom: 7,
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
    marginTop: 10,
  },

  error: {
    color: '#C0392B',
    fontWeight: '700',
    marginTop: 8,
  },

  drawing: {
    flexDirection: 'row',
    height: 170,
    marginTop: 15,
    marginBottom: 12,
    borderWidth: 3,
    borderColor: '#34566B',
    backgroundColor: '#E8F5FC',
    overflow: 'hidden',
  },

  glassPanel: {
    flex: 1,
    minWidth: 0,
    borderRightColor: '#34566B',
    justifyContent: 'center',
    alignItems: 'center',
  },

  panelNumber: {
    color: '#174769',
    fontWeight: 'bold',
  },

  divider: {
    height: 1,
    backgroundColor: '#E4EAF0',
    marginVertical: 12,
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

