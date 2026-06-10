> Bu projede SIGNAL_YOL_HARITASI.md tek kaynaktir. Her oturum basinda onu oku ve icindeki "AJAN, BURADAN BASLA" talimatini izle.

## Ortak protokol (Claude + Codex)

### Oturum baslangici (HER yeni promptta, kod yazmadan ONCE)
1. `LAST_UPDATES.md` dosyasinin en ustteki girdisini oku.
2. En ust girdinin zaman damgasina bak:
   - Girdi baska bir ajana aitse VEYA su andan ~1 saat ya da daha eskiyse:
     korlemesine devam etme -> girdiyi oku, gerekirse `git log --oneline -10`
     ve `git status` ile yereldeki gercek durumu dogrula, sonra hareket et.
   - Girdi senin son biraktigin taze girdinse: dogrudan devam edebilirsin.
3. Calismaya baslamadan once dosyanin en ustundeki "AKTIF AJAN" satirini
   kendi adinla ve su anki zamanla guncelle (cakismayi onlemek icin).

### Debug dongusu (sormadan uygula)
1. Degisiklik yap.
2. `npm run verify:fast` calistir.
3. Hata varsa: ciktiyi oku, kok nedeni bul, duzelt, 2'ye don.
4. verify:fast yesil olunca `npm run test` calistir, kirmiziysa 1'e don.
5. Faz kapanisinda bir kez `npm run verify` (build dahil) calistir.
6. Hala cozemedigin hata kalirsa DUR ve sadece o hatayi raporla.

### Oturum/is bitisi
- `LAST_UPDATES.md`'nin en ustune yeni bir girdi ekle (format asagida).
- "AKTIF AJAN" satirini "yok" yap (isi biraktin).
- NOT: `LAST_UPDATES.md` git'e gonderilmez (.gitignore'da). Ayni yerel
  klasorde calisan diger ajan onu dogrudan okur; commit etme.

### Asla yapma
- Lint hatasini `// eslint-disable` ile susturma; kok nedeni duzelt.
- `any` ile tip hatalarini gizleme.
- Calismayan kodu "gecici" diye commit'leme.
- Diger ajanin "AKTIF AJAN" olarak isaretli oldugu sirada ayni dosyalara
  paralel buyuk degisiklik yapma; once devral.

### Komutlar
- Hizli kontrol: npm run verify:fast
- Tam kontrol: npm run verify
- Testler: npm run test · E2E: npm run e2e

### Kimlik bilgisi (env/API) gerektiginde
Kod bir sonraki adim icin senin saglaman gereken bir env/anahtar istiyorsa:
1. DUR, o anahtar olmadan ilerleyebilecek diger isleri varsa onlari yap.
2. Kullanicaya tek tek soyle: hangi degisken, NEREDEN alinir (panel/URL),
   hangi sirayla, hangi isimle ortama eklenecek.
3. Kullanici "ekledim" diyene kadar o entegrasyonu canli saymadan devam et;
   ilgili ozelligi "bagli degil" durumunda birak, build'i kirma.
4. Aldigin degiskeni LAST_UPDATES.md'de "dikkat" satirina not dus.
