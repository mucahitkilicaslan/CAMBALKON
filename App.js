import React, { useEffect, useMemo, useState } from 'react';

import {
  Alert,
  ScrollView,
  View,
  Text,
  TextInput,
  Image,
  Pressable,
  StyleSheet,
  SafeAreaView,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculations';

// Profil fotoğrafları
const kasaImage = require(
  './katlanir-cam-aluminyum-duz-kasa-profil-30d010.png'
);

const camImage = require(
  './katlanir-cam-aluminyum-baza-profili-fi-d-8261.png'
);

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

// CAM BALKON PANEL ÇİZİMİ
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
        Üst ve alt kasa aynı profil fotoğrafıyla gösterilir.
        Cam profilleri her panelde ayrı bulunur.
      </Text>

      <View style={styles.drawing}>
        {/* ÜST KASA */}
        <View style={styles.caseProfile}>
          <Image
            source={kasaImage}
            style={styles.casePhoto}
            resizeMode="stretch"
          />

          <Text style={styles.caseLabel}>
            ÜST KASA
          </Text>
        </View>

        {/* CAM PANELLER */}
        <View style={styles.panelRow}>
          {Array.from({ length: count }, (_, index) => (
            <View
              key={index}
              style={[
                styles.panel,
                {
                  borderRightWidth:
                    index === count - 1 ? 0 : 1,
                },
              ]}
            >
              <Image
                source={camImage}
                style={styles.glassProfile}
                resizeMode="stretch"
              />

              <View
                style={[
                  styles.glass,
                  {
                    backgroundColor:
                      index % 2 === 0
                        ? '#D8EEF9'
                        : '#C4E4F5',
                  },
                ]}
              >
                {count <= 12 && (
                  <Text
                    style={[
                      styles.panelNumber,
                      {
                        fontSize: count > 8 ? 10 : 13,
                      },
                    ]}
                  >
                    {index + 1}
                  </Text>
                )}
              </View>

              <Image
                source={camImage}
                style={styles.glassProfile}
                resizeMode="stretch"
              />
            </View>
          ))}
        </View>

        {/* ALT KASA */}
        <View style={styles.caseProfile}>
          <Image
            source={kasaImage}
            style={styles.casePhoto}
            resizeMode="stretch"
          />

          <Text style={styles.caseLabel}>
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
        Panel adedi: {calc.panels}
      </Text>

      <Text style={styles.value}>
        Net cam: {format(calc.netWidth, 2)} ×{' '}
        {format(calc.netHeight, 1)} mm
      </Text>

      <Text style={styles.value}>
        Cam üst/alt profil kesimi:{' '}
        {format(calc.glassProfileLength, 2)} mm
      </Text>

      <Text style={styles.note}>
        Çizim şematiktir. Gerçek profil fotoğrafları
        ince şeritlere yerleştirilmiştir; teknik ölçekli
        profil kesit çizimi değildir.
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
            const allowed = Object.keys(initial);

            const savedData = Object.fromEntries(
              Object.entries(parsed).filter(([key]) =>
                allowed.includes(key)
              )
            );

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
        <Text style={styles.brand}>
          CAM BALKON PRO
        </Text>

        <Text style={styles.title}>
          Katlanır Cam Balkon
        </Text>

        <Text style={styles.subtitle}>
          Otomatik cam kesim ve fiyat hesaplama
        </Text>

        {/* MÜŞTERİ BİLGİLERİ */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Müşteri ve Proje
          </Text>

          {field('customer', 'Müşteri Adı', true)}
          {field('project', 'Proje / Uygulama Yeri', true)}
        </View>

        {/* ÖLÇÜLER */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Ölçüler (mm)
          </Text>

          {field('width', 'Toplam Genişlik (mm)')}
          {field('height', 'Toplam Yükseklik (mm)')}
          {field('panels', 'Panel Adedi')}

          {calc.valid && (
            <Text style={styles.value}>
              Panel eni: {format(calc.panelWidth, 2)} mm
            </Text>
          )}
        </View>

        {/* CAM KESİM LİSTESİ */}
        <View style={styles.card}>
          <Text style={styles.section}>
            Cam Kesim Listesi
          </Text>

          <Text style={styles.note}>
            Cam eni: (Genişlik - 25) / Panel adedi - 0,6 mm
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
                Cam adedi: {calc.panels}
              </Text>
            </>
          ) : (
            <Text style={styles.error}>
              Ölçüler geçersiz. Genişlik, yükseklik
              ve panel adedini kontrol edin.
            </Text>
          )}
        </View>

        {/* CAM BALKON PANEL ÇİZİMİ */}
        {calc.valid && <PanelDrawing calc={calc} />}

        {/* FİYAT TEKLİFİ */}
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

          <Text style={styles.priceLine}>
            Cam balkon: {format(calc.material)} TL
          </Text>

          <Text style={styles.priceLine}>
            İskonto: -{format(calc.discount)} TL
          </Text>

          <Text style={styles.priceLine}>
            Ara toplam: {format(calc.subtotal)} TL
          </Text>

          <Text style={styles.priceLine}>
            KDV: {format(calc.vat)} TL
          </Text>

          <Text style={styles.total}>
            GENEL TOPLAM: {format(calc.total)} TL
          </Text>
        </View>

        {/* OTOMATİK KAYIT */}
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
          Cam kesim ölçüleri belirlenen kurallara göre
          hesaplanır. Gerçek imalat öncesinde
          ölçülerin kontrol edilmesi gerekir.
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

  drawing: {
    borderWidth: 2,
    borderColor: '#34566B',
    marginTop: 15,
    marginBottom: 12,
    overflow: 'hidden',
  },

  caseProfile: {
    height: 22,
    backgroundColor: '#B8C4CC',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  casePhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },

  caseLabel: {
    color: '#173D59',
    fontSize: 10,
    fontWeight: '900',
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },

  panelRow: {
    flexDirection: 'row',
    height: 170,
  },

  panel: {
    flex: 1,
    minWidth: 0,
    borderRightColor: '#34566B',
  },

  glassProfile: {
    width: '100%',
    height: 8,
    backgroundColor: '#A4B5C0',
  },

  glass: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  panelNumber: {
    color: '#174769',
    fontWeight: 'bold',
    fontSize: 13,
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
