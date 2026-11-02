# Cam Balkon Pro — İlk Mobil Sürüm

Android ve iPhone için Expo / React Native başlangıç projesi.

## Çalıştırma
1. Bilgisayara Node.js LTS kurun.
2. Bu klasörde terminal açıp `npm install` çalıştırın.
3. `npx expo start` komutunu çalıştırın.
4. Android veya iPhone'da Expo Go uygulamasıyla terminaldeki QR kodu okutun. (Aynı ağ gerekebilir.)

## Özellikler
- Müşteri ve proje adı
- Toplam açıklık, yükseklik ve panel adedi
- En ve boy için profil / fitil / boşluk paylarının manuel girilmesi
- Brüt alan, net cam kesimi, m² fiyatı, montaj, nakliye, diğer, iskonto ve KDV hesaplamaları
- Panel sayısına göre değişen SVG çizim
- Taslağın cihazda yerel saklanması

## Hesaplama kuralları
- Brüt panel eni = toplam açıklık / panel sayısı
- Net cam eni = brüt panel eni − (profil en + fitil en + boşluk en)
- Net cam boyu = yükseklik − (profil boy + fitil boy + boşluk boy)
- Fiyatlandırma brüt açıklık alanına göredir: toplam genişlik × yükseklik / 1.000.000
- İskonto malzeme + montaj + nakliye + diğer toplamına uygulanır; ardından KDV hesaplanır.

**Uyarı:** Bu eşit panel varsayımı ve manuel pay modeli üreticiye özgü kesim formülü değildir. Çizim imalat ölçeğinde değildir. Net kesim üretim öncesi doğrulanmalıdır.

## Henüz eklenmeyenler
PDF teklif dışa aktarma, çoklu proje listesi, imalat tipi alüminyum kesim listesi, uygulama mağazalarına dağıtım.
