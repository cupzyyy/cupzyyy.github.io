import 'dart:html';

void main() {
  // Mendapatkan elemen-elemen dari DOM
  var judul = querySelector('#judul') as HeadingElement;
  var pesan = querySelector('#pesan') as ParagraphElement;
  var tombolUbah = querySelector('#tombolUbah') as ButtonElement;
  var tombolReset = querySelector('#tombolReset') as ButtonElement;
  
  // Variabel untuk counter
  int counter = 0;
  
  // Event listener untuk tombol Ubah
  tombolUbah.onClick.listen((event) {
    counter++;
    pesan.text = 'Tombol telah diklik $counter kali';
    judul.text = 'Halo Dart!';
  });
  
  // Event listener untuk tombol Reset
  tombolReset.onClick.listen((event) {
    counter = 0;
    pesan.text = 'Klik tombol di bawah untuk mengubah pesan.';
    judul.text = 'Selamat Datang di Dart Web!';
  });
  
  // Menambahkan elemen baru secara dinamis
  var infoDiv = DivElement()
    ..text = 'Ini adalah elemen yang ditambahkan dengan Dart'
    ..style.marginTop = '20px'
    ..style.color = 'blue';
  
  querySelector('.container')?.append(infoDiv);
  
  print('Aplikasi Dart berhasil dimuat!');
}