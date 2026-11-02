# Cam Balkon Pro — Android APK oluşturma

Bu paket bir **APK değil**, Android APK üretimine hazır Expo kaynak projesidir. APK'nın üretilmesi için Expo hesabı ve bulut derleme işlemi gerekir.

## Gerekenler
- Bilgisayarda Node.js LTS ve internet bağlantısı
- Ücretsiz Expo hesabı: https://expo.dev/signup

## APK üretme (Windows PowerShell veya macOS Terminal)
1. ZIP'i bilgisayarda bir klasöre çıkarın.
2. Terminalde `CamBalkonPro` klasörüne girin.
3. `npm install` komutunu çalıştırın.
4. `npx eas-cli login` komutuyla Expo hesabınıza giriş yapın.
5. `npx eas-cli build:configure -p android` komutunu çalıştırın. Mevcut `eas.json` ayarlarını koruyun.
6. `npx eas-cli build -p android --profile preview` komutunu çalıştırın.
7. İlk çalıştırmada Android imzalama anahtarı sorulursa Expo'nun anahtarı oluşturmasını seçin.
8. Derleme bitince terminalde verilen Expo bağlantısını Android telefonunuzda açıp `.apk` dosyasını indirin.
9. Android'in izin ekranında, yalnızca kendi oluşturduğunuz APK için bu kaynaktan yüklemeye izin verip kurulumu tamamlayın. Sonra izni kapatabilirsiniz.

## Önemli
- `preview` profili Android'e doğrudan kurulabilir APK üretir.
- `production` profili Google Play için AAB üretir; bu dosya APK gibi doğrudan kurulmaz.
- Derleme işlemi bu ortamda yapılmadı; uygulamanın cihazda açıldığı henüz doğrulanmadı.
- Paket kimliği `com.cambalkonpro.teklif` olarak tanımlıdır. Yayınlamadan önce size ait benzersiz kimlikle değiştirilebilir.
- Mevcut sürümde ölçü, eşit panel bölünmesi, manuel kesim payları, dinamik panel görünümü ve teklif hesabı bulunur. İmalat kesim değerlerini profil üreticisinin kurallarıyla doğrulayın.
- Expo hesabı, imzalama anahtarı ve derleme bağlantısını güvenli saklayın.
