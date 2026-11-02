
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
      <Text style={styles.section}>Cam Balkon Panel Çizimi</Text>
      <Text style={styles.note}>
        Üst ve alt kasa tek parça, cam profilleri panel bazında
      </Text>

      <View style={styles.drawing}>
        <View style={styles.caseProfile}>
          <Text style={styles.caseText}>ÜST KASA</Text>
        </View>

        <View style={styles.panelRow}>
          {Array.from({ length: count }, (_, index) => (
            <View
              key={index}
              style={[
                styles.panel,
                {
                  borderRightWidth: index === count - 1 ? 0 : 1,
                },
              ]}
            >
              <View style={styles.glassProfile} />

              <View
                style={[
                  styles.glass,
                  {
                    backgroundColor:
                      index % 2 === 0 ? '#D8EEF9' : '#C4E4F5',
                  },
                ]}
              >
                {count <= 12 && (
                  <Text style={styles.panelNumber}>
                    {index + 1}
                  </Text>
                )}
              </View>

              <View style={styles.glassProfile} />
            </View>
          ))}
        </View>

        <View style={styles.caseProfile}>
          <Text style={styles.caseText}>ALT KASA</Text>
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
        Çizim şematiktir; profil kesitlerinin birebir teknik
        çizimi değildir.
      </Text>
    </View>
  );
}

function CutRow({ name, length, qty }) {
  return (
    <View style={styles.cutRow}>
      <Text style={styles.cutName}>{name}</Text>
      <Text style={styles.cutLength}>
        {format(length, 2)} mm
      </Text>
      <Text style={styles.cutQty}>{qty} adet</Text>
    </View>
  );
}

function AluminumCutList({ calc }) {
  return (
    <View style={styles.card}>
      <Text style={styles.section}>
        Alüminyum Profil Kesim Listesi
      </Text>

      <Text style={styles.subheading}>Kasa Profilleri</Text>
      <Text style={styles.note}>
        Kasa profilleri toplam genişlik ölçüsünde,
        düşümsüz ve tek parça kesilir.
      </Text>

      <CutRow
        name="Üst kasa"
        length={calc.caseProfileLength}
        qty={calc.upperCaseQty}
      />
      <CutRow
        name="Alt kasa"
        length={calc.caseProfileLength}
        qty={calc.lowerCaseQty}
      />

      <View style={styles.divider} />

      <Text style={styles.subheading}>Cam Profilleri</Text>
      <Text style={styles.note}>
        Her panel eninden otomatik 10 mm düşülür.
      </Text>

      <CutRow
        name="Cam üst profili"
        length={calc.glassProfileLength}
        qty={calc.upperGlassQty}
      />
      <CutRow
        name="Cam alt profili"
        length={calc.glassProfileLength}
        qty={calc.lowerGlassQty}
      />

      <View style={styles.divider} />

      {calc.valid ? (
        <>
          <Text style={styles.value}>
            Toplam parça: {calc.aluminumTotalPieces} adet
          </Text>
          <Text style={styles.total}>
            TOPLAM ALÜMİNYUM:{' '}
            {format(calc.aluminumTotalLength / 1000, 2)} metre
          </Text>
        </>
      ) : (
        <Text style={styles.error}>
          Geçerli ölçüler girildiğinde kesim listesi hesaplanır.
        </Text>
      )}
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
        <Text style={styles.brand}>CAM BALKON PRO</Text>
        <Text style={styles.title}>Katlanır Cam Balkon</Text>
        <Text style={styles.subtitle}>
          Cam ve alüminyum otomatik kesim hesaplama
        </Text>

        <View style={styles.card}>
          <Text style={styles.section}>Müşteri ve Proje</Text>
          {field('customer', 'Müşteri Adı', true)}
          {field('project', 'Proje / Uygulama Yeri', true)}
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Ölçüler (mm)</Text>

          {field('width', 'Toplam Genişlik (mm)')}
          {field('height', 'Toplam Yükseklik (mm)')}
          {field('panels', 'Panel Adedi')}

          <Text style={styles.value}>
            Panel eni: {format(calc.panelWidth, 2)} mm
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.section}>Cam Kesim Listesi</Text>

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

        <PanelDrawing calc={calc} />

        <AluminumCutList calc={calc} />

        <View style={styles.card}>
          <Text style={styles.section}>Teklif Hesabı</Text>

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
          Profil ölçüleri girilen kurallara göre otomatik
          hesaplanır. Gerçek imalat öncesinde ölçüleri
          doğrulayın. Toplam uzunluk kesim firesi içermez.
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
    marginBottom: 9,
    marginTop: 5,
    fontSize: 15,
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
    backgroundColor: '#738A9B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  caseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
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
    height: 9,
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
  cutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#E5EBF0',
  },
  cutName: {
    flex: 1.5,
    color: '#294A61',
    fontWeight: '700',
    fontSize: 12,
  },
  cutLength: {
    flex: 1.2,
    textAlign: 'right',
    color: '#164F77',
    fontWeight: '800',
    fontSize: 12,
  },
  cutQty: {
    flex: 0.8,
    textAlign: 'right',
    color: '#294A61',
    fontSize: 12,
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
