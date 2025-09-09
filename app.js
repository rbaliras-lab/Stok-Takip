// App.js - Excel Entegrasyonlu React Native Stok Takip Uygulaması
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  ScrollView,
  Modal,
  SafeAreaView,
  RefreshControl,
  StatusBar,
  ActivityIndicator
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const StokTakipApp = () => {
  const [urunler, setUrunler] = useState([]);
  const [filtreliUrunler, setFiltreliUrunler] = useState([]);
  const [aramaMetni, setAramaMetni] = useState('');
  const [sktUyarisi, setSktUyarisi] = useState(30);
  const [modalGorunur, setModalGorunur] = useState(false);
  const [ayarlarModal, setAyarlarModal] = useState(false);
  const [yukleniyor, setYukleniyor] = useState(false);
  const [yenileniyor, setYenileniyor] = useState(false);
  const [duzenlemeModu, setDuzenlemeModu] = useState(null);
  
  const [yeniUrun, setYeniUrun] = useState({
    numune_no: '',
    urun_adi: '',
    ref_no: '',
    lot_no: '',
    sayim: '0',
    skt: '',
    gelis_tarihi: '',
    firma: '',
    aciklama: ''
  });

  // Başlangıç verileri (örnek)
  const baslangicVerileri = [
    {
      numune_no: '1',
      urun_adi: 'Temasla Aktive Olan Güvenli Kan Lanseti 18G Blade',
      ref_no: '2391818BN',
      lot_no: '0120141',
      sayim: 8,
      skt: '2025.06',
      gelis_tarihi: '25.08.2020',
      firma: 'MEDSUN',
      aciklama: ''
    }
  ];

  useEffect(() => {
    veriYukle();
  }, []);

  useEffect(() => {
    aramaFiltreleme();
    veriKaydet();
  }, [urunler, aramaMetni]);

  const veriYukle = async () => {
    try {
      const kaydedilmisVeri = await AsyncStorage.getItem('stokVerileri');
      const ayarlar = await AsyncStorage.getItem('uygulamaAyarlari');
      
      if (kaydedilmisVeri) {
        setUrunler(JSON.parse(kaydedilmisVeri));
      } else {
        setUrunler(baslangicVerileri);
      }
      
      if (ayarlar) {
        const parsedAyarlar = JSON.parse(ayarlar);
        setSktUyarisi(parsedAyarlar.sktUyarisi || 30);
      }
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      setUrunler(baslangicVerileri);
    }
  };

  const veriKaydet = async () => {
    try {
      await AsyncStorage.setItem('stokVerileri', JSON.stringify(urunler));
      await AsyncStorage.setItem('uygulamaAyarlari', JSON.stringify({ sktUyarisi }));
    } catch (error) {
      console.error('Veri kaydetme hatası:', error);
    }
  };

  const aramaFiltreleme = () => {
    if (!aramaMetni.trim()) {
      setFiltreliUrunler(urunler);
    } else {
      const filtreli = urunler.filter(urun =>
        urun.urun_adi?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        urun.ref_no?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        urun.lot_no?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        urun.firma?.toLowerCase().includes(aramaMetni.toLowerCase()) ||
        urun.numune_no?.toString().includes(aramaMetni)
      );
      setFiltreliUrunler(filtreli);
    }
  };

  const sktKontrol = (sktTarihi) => {
    if (!sktTarihi) return 'normal';
    
    const bugun = new Date();
    let skt;
    
    // Farklı tarih formatlarını destekle
    if (sktTarihi.includes('.')) {
      skt = new Date(sktTarihi.replace('.', '-') + '-01');
    } else if (sktTarihi.includes('/')) {
      skt = new Date(sktTarihi.replace('/', '-') + '-01');
    } else {
      skt = new Date(sktTarihi + '-01-01');
    }
    
    const farkGun = Math.ceil((skt - bugun) / (1000 * 60 * 60 * 24));
    
    if (farkGun < 0) return 'gecmis';
    if (farkGun <= sktUyarisi) return 'yakin';
    return 'normal';
  };

  const stokArtir = (numune_no, miktar = 1) => {
    setUrunler(prev => prev.map(urun => 
      urun.numune_no === numune_no 
        ? { ...urun, sayim: (urun.sayim || 0) + miktar }
        : urun
    ));
  };

  const stokAzalt = (numune_no, miktar = 1) => {
    setUrunler(prev => prev.map(urun => 
      urun.numune_no === numune_no 
        ? { ...urun, sayim: Math.max(0, (urun.sayim || 0) - miktar) }
        : urun
    ));
  };

  const yeniUrunEkle = () => {
    if (!yeniUrun.urun_adi.trim() || !yeniUrun.numune_no.trim()) {
      Alert.alert('Hata', 'Ürün adı ve numune no zorunludur!');
      return;
    }

    // Aynı numune no kontrolü
    if (urunler.find(u => u.numune_no === yeniUrun.numune_no)) {
      Alert.alert('Hata', 'Bu numune numarası zaten kullanılıyor!');
      return;
    }
    
    const yeniNumune = {
      ...yeniUrun,
      sayim: parseInt(yeniUrun.sayim) || 0,
      gelis_tarihi: yeniUrun.gelis_tarihi || new Date().toLocaleDateString('tr-TR')
    };
    
    setUrunler(prev => [...prev, yeniNumune]);
    setYeniUrun({
      numune_no: '',
      urun_adi: '',
      ref_no: '',
      lot_no: '',
      sayim: '0',
      skt: '',
      gelis_tarihi: '',
      firma: '',
      aciklama: ''
    });
    setModalGorunur(false);
    Alert.alert('Başarılı', 'Ürün başarıyla eklendi!');
  };

  const urunSil = (numune_no, urun_adi) => {
    Alert.alert(
      'Ürün Sil',
      `"${urun_adi}" ürününü silmek istediğinizden emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => setUrunler(prev => prev.filter(urun => urun.numune_no !== numune_no))
        }
      ]
    );
  };

  const excelYukle = async () => {
    try {
      setYukleniyor(true);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
               'application/vnd.ms-excel',
               'text/csv'],
        copyToCacheDirectory: true,
      });

      if (result.type === 'cancel') {
        setYukleniyor(false);
        return;
      }

      const fileUri = result.uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // CSV parsing (basit)
      const lines = fileContent.split('\n');
      const headers = lines[0].split('\t').map(h => h.replace(/"/g, '').trim());
      
      const yeniVeriler = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split('\t').map(v => v.replace(/"/g, '').trim());
          const urun = {
            numune_no: values[0] || `auto-${Date.now()}-${i}`,
            urun_adi: values[1] || '',
            ref_no: values[2] || '',
            lot_no: values[3] || '',
            sayim: parseInt(values[4]) || 0,
            skt: values[5] || '',
            gelis_tarihi: values[6] || '',
            firma: values[7] || '',
            aciklama: values[8] || ''
          };
          
          if (urun.urun_adi) {
            yeniVeriler.push(urun);
          }
        }
      }

      if (yeniVeriler.length > 0) {
        Alert.alert(
          'Excel Yükleme',
          `${yeniVeriler.length} ürün bulundu. Nasıl yüklensin?`,
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Ekle', 
              onPress: () => {
                setUrunler(prev => [...prev, ...yeniVeriler]);
                Alert.alert('Başarılı', `${yeniVeriler.length} ürün eklendi!`);
              }
            },
            { 
              text: 'Değiştir', 
              style: 'destructive',
              onPress: () => {
                setUrunler(yeniVeriler);
                Alert.alert('Başarılı', `Tüm veriler değiştirildi! ${yeniVeriler.length} ürün yüklendi.`);
              }
            }
          ]
        );
      } else {
        Alert.alert('Hata', 'Excel dosyasında geçerli ürün verisi bulunamadı!');
      }

    } catch (error) {
      console.error('Excel yükleme hatası:', error);
      Alert.alert('Hata', 'Excel dosyası okunurken hata oluştu: ' + error.message);
    } finally {
      setYukleniyor(false);
    }
  };

  const excelIndir = async () => {
    try {
      // CSV formatında dışa aktarma
      const header = 'NUMUNE NO\tÜRÜN ADI\tREF. NO\tLOT NO\tSAYIM\tSKT\tGeliş tarihi\tFİRMA\tAçıklama\n';
      const csvContent = header + urunler.map(urun => 
        `${urun.numune_no}\t"${urun.urun_adi}"\t${urun.ref_no || ''}\t${urun.lot_no || ''}\t${urun.sayim}\t${urun.skt || ''}\t${urun.gelis_tarihi || ''}\t${urun.firma || ''}\t${urun.aciklama || ''}`
      ).join('\n');
      
      const fileName = `stok-listesi-${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { 
        encoding: FileSystem.EncodingType.UTF8 
      });
      
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Stok Listesini Paylaş'
      });

      Alert.alert('Başarılı', 'Stok listesi başarıyla dışa aktarıldı!');
    } catch (error) {
      console.error('Dışa aktarma hatası:', error);
      Alert.alert('Hata', 'Dosya oluşturulurken hata oluştu: ' + error.message);
    }
  };

  const tumVeriSil = () => {
    Alert.alert(
      'Tüm Verileri Sil',
      'Tüm ürün verilerini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: () => {
            setUrunler([]);
            Alert.alert('Başarılı', 'Tüm veriler silindi.');
          }
        }
      ]
    );
  };

  const ornekVeriYukle = () => {
    Alert.alert(
      'Örnek Veri Yükle',
      'Mevcut veriler silinip örnek veriler yüklensin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Yükle',
          onPress: () => {
            setUrunler([
              ...baslangicVerileri,
              {
                numune_no: '2',
                urun_adi: 'Temasla Aktive Olan Güvenli Kan Lanseti 21G',
                ref_no: '2392118N',
                lot_no: '0120148',
                sayim: 26,
                skt: '2025.06',
                gelis_tarihi: '25.08.2020',
                firma: 'MEDSUN',
                aciklama: ''
              },
              {
                numune_no: '11',
                urun_adi: 'Güvenlikli Kelebek Set 25G',
                ref_no: '24125190K',
                lot_no: '20200428',
                sayim: 3,
                skt: '2025.03',
                gelis_tarihi: '30.06.2020',
                firma: 'MEKON',
                aciklama: 'Düşük stok'
              }
            ]);
            Alert.alert('Başarılı', 'Örnek veriler yüklendi!');
          }
        }
      ]
    );
  };

  const yenile = async () => {
    setYenileniyor(true);
    await veriYukle();
    setTimeout(() => setYenileniyor(false), 1000);
  };

  const sktUyariSayisi = filtreliUrunler.filter(urun => {
    const durum = sktKontrol(urun.skt);
    return durum === 'gecmis' || durum === 'yakin';
  }).length;

  const dusukStokSayisi = filtreliUrunler.filter(urun => (urun.sayim || 0) <= 5).length;

  const UrunItem = ({ item }) => {
    const sktDurumu = sktKontrol(item.skt);
    const dusukStok = (item.sayim || 0) <= 5;
    
    const arkaplanRengi = () => {
      if (sktDurumu === 'gecmis') return '#fee2e2';
      if (sktDurumu === 'yakin') return '#fef3c7';
      if (dusukStok) return '#fed7aa';
      return '#ffffff';
    };

    return (
      <View style={[styles.urunItem, { backgroundColor: arkaplanRengi() }]}>
        <View style={styles.urunBaslik}>
          <Text style={styles.numuneNo}>#{item.numune_no}</Text>
          <TouchableOpacity 
            onPress={() => urunSil(item.numune_no, item.urun_adi)}
            style={styles.silButon}
          >
            <Ionicons name="trash-outline" size={20} color="#ef4444" />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.urunAdi} numberOfLines={2}>{item.urun_adi}</Text>
        
        <View style={styles.detaylar}>
          <Text style={styles.detay}>Ref: {item.ref_no || '-'}</Text>
          <Text style={styles.detay}>Lot: {item.lot_no || '-'}</Text>
          {item.firma && <Text style={styles.detay}>Firma: {item.firma}</Text>}
        </View>

        <View style={styles.stokSkt}>
          <View style={styles.stokKontrol}>
            <TouchableOpacity 
              onPress={() => stokAzalt(item.numune_no)}
              style={[styles.stokButon, styles.azaltButon]}
            >
              <Ionicons name="remove" size={20} color="white" />
            </TouchableOpacity>
            
            <View style={styles.stokSayi}>
              <Text style={[styles.sayim, dusukStok && styles.dusukStokText]}>
                {item.sayim || 0}
              </Text>
              {dusukStok && <Ionicons name="warning" size={16} color="#f97316" />}
            </View>
            
            <TouchableOpacity 
              onPress={() => stokArtir(item.numune_no)}
              style={[styles.stokButon, styles.artirButon]}
            >
              <Ionicons name="add" size={20} color="white" />
            </TouchableOpacity>
          </View>

          <View style={styles.sktBilgi}>
            <Text style={[
              styles.sktText,
              sktDurumu === 'gecmis' && styles.sktGecmis,
              sktDurumu === 'yakin' && styles.sktYakin
            ]}>
              SKT: {item.skt || 'Yok'}
            </Text>
            {(sktDurumu === 'gecmis' || sktDurumu === 'yakin') && (
              <Ionicons 
                name="warning" 
                size={16} 
                color={sktDurumu === 'gecmis' ? '#ef4444' : '#f59e0b'} 
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.baslik}>Stok Takip</Text>
        <View style={styles.headerButonlar}>
          <TouchableOpacity onPress={() => setAyarlarModal(true)} style={styles.ayarButon}>
            <Ionicons name="settings-outline" size={22} color="#6b7280" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setModalGorunur(true)} style={styles.ekleButon}>
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      {/* İstatistikler */}
      <View style={styles.istatistikler}>
        <View style={styles.istatistikItem}>
          <Text style={styles.istatistikSayi}>{filtreliUrunler.length}</Text>
          <Text style={styles.istatistikLabel}>Toplam Ürün</Text>
        </View>
        <View style={[styles.istatistikItem, styles.uyariRenk]}>
          <Text style={styles.istatistikSayi}>{dusukStokSayisi}</Text>
          <Text style={styles.istatistikLabel}>Düşük Stok</Text>
        </View>
        <View style={[styles.istatistikItem, styles.tehlikeRenk]}>
          <Text style={styles.istatistikSayi}>{sktUyariSayisi}</Text>
          <Text style={styles.istatistikLabel}>SKT Uyarısı</Text>
        </View>
      </View>

      {/* Arama ve Eylemler */}
      <View style={styles.aramaBolumu}>
        <View style={styles.aramaContainer}>
          <Ionicons name="search" size={20} color="#6b7280" style={styles.aramaIcon} />
          <TextInput
            style={styles.aramaInput}
            placeholder="Ürün ara..."
            value={aramaMetni}
            onChangeText={setAramaMetni}
          />
        </View>
        
        <View style={styles.eylemler}>
          <TouchableOpacity onPress={excelYukle} style={styles.eylemButon}>
            <Ionicons name="cloud-upload-outline" size={20} color="#10b981" />
          </TouchableOpacity>
          <TouchableOpacity onPress={excelIndir} style={styles.eylemButon}>
            <Ionicons name="cloud-download-outline" size={20} color="#3b82f6" />
          </TouchableOpacity>
          <TouchableOpacity onPress={yenile} style={styles.eylemButon}>
            <Ionicons name="refresh-outline" size={20} color="#6b7280" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Yükleme Göstergesi */}
      {yukleniyor && (
        <View style={styles.yuklemeContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.yuklemeText}>Excel dosyası işleniyor...</Text>
        </View>
      )}

      {/* Ürün Listesi */}
      <FlatList
        data={filtreliUrunler}
        keyExtractor={(item) => item.numune_no.toString()}
        renderItem={({ item }) => <UrunItem item={item} />}
        refreshControl={
          <RefreshControl refreshing={yenileniyor} onRefresh={yenile} />
        }
        ListEmptyComponent={() => (
          <View style={styles.bosListe}>
            <Ionicons name="cube-outline" size={64} color="#d1d5db" />
            <Text style={styles.bosListeText}>Ürün bulunamadı</Text>
            <Text style={styles.bosListeAlt}>Excel yükleyin veya manuel ürün ekleyin</Text>
            <TouchableOpacity onPress={ornekVeriYukle} style={styles.ornekVeriButon}>
              <Text style={styles.ornekVeriText}>Örnek Veri Yükle</Text>
            </TouchableOpacity>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Yeni Ürün Modal */}
      <Modal
        visible={modalGorunur}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalBaslik}>Yeni Ürün Ekle</Text>
            <TouchableOpacity onPress={() => setModalGorunur(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalIcerik}>
            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Numune No *</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.numune_no}
                onChangeText={(text) => setYeniUrun({...yeniUrun, numune_no: text})}
                placeholder="Örn: 123"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Ürün Adı *</Text>
              <TextInput
                style={[styles.input, styles.cokSatirInput]}
                value={yeniUrun.urun_adi}
                onChangeText={(text) => setYeniUrun({...yeniUrun, urun_adi: text})}
                placeholder="Ürün adını girin"
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Ref No</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.ref_no}
                onChangeText={(text) => setYeniUrun({...yeniUrun, ref_no: text})}
                placeholder="Referans numarası"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Lot No</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.lot_no}
                onChangeText={(text) => setYeniUrun({...yeniUrun, lot_no: text})}
                placeholder="Lot numarası"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Sayım</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.sayim}
                onChangeText={(text) => setYeniUrun({...yeniUrun, sayim: text})}
                placeholder="0"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>SKT (YYYY.MM)</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.skt}
                onChangeText={(text) => setYeniUrun({...yeniUrun, skt: text})}
                placeholder="2025.06"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Firma</Text>
              <TextInput
                style={styles.input}
                value={yeniUrun.firma}
                onChangeText={(text) => setYeniUrun({...yeniUrun, firma: text})}
                placeholder="Firma adı"
              />
            </View>

            <View style={styles.inputGrup}>
              <Text style={styles.inputLabel}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.cokSatirInput]}
                value={yeniUrun.aciklama}
                onChangeText={(text) => setYeniUrun({...yeniUrun, aciklama: text})}
                placeholder="Ek açıklama"
                multiline
                numberOfLines={2}
              />
            </View>

            <TouchableOpacity onPress={yeniUrunEkle} style={styles.kaydetButon}>
              <Text style={styles.kaydetButonText}>Ürün Ekle</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Ayarlar Modal */}
      <Modal
        visible={ayarlarModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalBaslik}>Ayarlar ve Veri Yönetimi</Text>
            <TouchableOpacity onPress={() => setAyarlarModal(false)}>
              <Ionicons name="close" size={24} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalIcerik}>
            <View style={styles.ayarGrup}>
              <Text style={styles.ayarBaslik}>SKT Uyarı Ayarları</Text>
              <View style={styles.inputGrup}>
                <Text style={styles.inputLabel}>SKT Uyarı Günü</Text>
                <TextInput
                  style={styles.input}
                  value={sktUyarisi.toString()}
                  onChangeText={(text) => setSktUyarisi(parseInt(text) || 30)}
                  placeholder="30"
                  keyboardType="numeric"
                />
                <Text style={styles.aciklama}>SKT tarihinden kaç gün önce uyarı verilsin</Text>
              </View>
            </View>

            <View style={styles.ayarGrup}>
              <Text style={styles.ayarBaslik}>Excel İşlemleri</Text>
              <TouchableOpacity onPress={excelYukle} style={styles.ayarButon}>
                <Ionicons name="cloud-upload-outline" size={24} color="#10b981" />
                <View style={styles.ayarButonText}>
                  <Text style={styles.ayarButonBaslik}>Excel Yükle</Text>
                  <Text style={styles.ayarButonAlt}>Stok listesini CSV olarak dışa aktar</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.ayarGrup}>
              <Text style={styles.ayarBaslik}>Veri Yönetimi</Text>
              
              <TouchableOpacity onPress={ornekVeriYukle} style={styles.ayarButon}>
                <Ionicons name="library-outline" size={24} color="#8b5cf6" />
                <View style={styles.ayarButonText}>
                  <Text style={styles.ayarButonBaslik}>Örnek Veri Yükle</Text>
                  <Text style={styles.ayarButonAlt}>Test için örnek ürünleri yükle</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={tumVeriSil} style={[styles.ayarButon, styles.tehlikeButon]}>
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
                <View style={styles.ayarButonText}>
                  <Text style={[styles.ayarButonBaslik, styles.tehlikeText]}>Tüm Verileri Sil</Text>
                  <Text style={styles.ayarButonAlt}>Dikkat! Bu işlem geri alınamaz</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.ayarGrup}>
              <Text style={styles.ayarBaslik}>Uygulama Bilgileri</Text>
              <View style={styles.bilgiContainer}>
                <Text style={styles.bilgiText}>📱 Stok Takip v1.0</Text>
                <Text style={styles.bilgiText}>👤 Toplam Ürün: {urunler.length}</Text>
                <Text style={styles.bilgiText}>⚠️ SKT Uyarısı: {sktUyariSayisi}</Text>
                <Text style={styles.bilgiText}>📉 Düşük Stok: {dusukStokSayisi}</Text>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  baslik: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  headerButonlar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ayarButon: {
    marginRight: 12,
    padding: 8,
  },
  ekleButon: {
    backgroundColor: '#3b82f6',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  istatistikler: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  istatistikItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  uyariRenk: {
    backgroundColor: '#fef3c7',
  },
  tehlikeRenk: {
    backgroundColor: '#fee2e2',
  },
  istatistikSayi: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  istatistikLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  aramaBolumu: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  aramaContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  aramaIcon: {
    marginRight: 8,
  },
  aramaInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#1f2937',
  },
  eylemler: {
    flexDirection: 'row',
    marginLeft: 10,
  },
  eylemButon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  yuklemeContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  yuklemeText: {
    marginTop: 10,
    color: '#6b7280',
    fontSize: 14,
  },
  urunItem: {
    margin: 10,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  urunBaslik: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  numuneNo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6b7280',
  },
  silButon: {
    padding: 4,
  },
  urunAdi: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    lineHeight: 22,
  },
  detaylar: {
    flexDirection: 'column',
    marginBottom: 12,
  },
  detay: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  stokSkt: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stokKontrol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stokButon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  azaltButon: {
    backgroundColor: '#ef4444',
  },
  artirButon: {
    backgroundColor: '#10b981',
  },
  stokSayi: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    minWidth: 50,
    justifyContent: 'center',
  },
  sayim: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginRight: 4,
  },
  dusukStokText: {
    color: '#f97316',
  },
  sktBilgi: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sktText: {
    fontSize: 12,
    color: '#6b7280',
    marginRight: 4,
  },
  sktGecmis: {
    color: '#ef4444',
    fontWeight: '600',
  },
  sktYakin: {
    color: '#f59e0b',
    fontWeight: '600',
  },
  bosListe: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  bosListeText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#9ca3af',
    marginTop: 16,
  },
  bosListeAlt: {
    fontSize: 14,
    color: '#d1d5db',
    marginTop: 4,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  ornekVeriButon: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#8b5cf6',
    borderRadius: 8,
  },
  ornekVeriText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalBaslik: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  modalIcerik: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGrup: {
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: 'white',
    color: '#1f2937',
  },
  cokSatirInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  kaydetButon: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  kaydetButonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  ayarGrup: {
    marginTop: 20,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  ayarBaslik: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  ayarButon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  ayarButonText: {
    marginLeft: 16,
    flex: 1,
  },
  ayarButonBaslik: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  ayarButonAlt: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  tehlikeButon: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  tehlikeText: {
    color: '#ef4444',
  },
  aciklama: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 6,
  },
  bilgiContainer: {
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    padding: 16,
  },
  bilgiText: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8,
  },
});

export default StokTakipApp;

// package.json - Gerekli bağımlılıklar:
/*
{
  "name": "stok-takip-app",
  "version": "1.0.0",
  "main": "node_modules/expo/AppEntry.js",
  "scripts": {
    "start": "expo start",
    "android": "expo start --android",
    "ios": "expo start --ios",
    "web": "expo start --web"
  },
  "dependencies": {
    "expo": "~49.0.0",
    "react": "18.2.0",
    "react-native": "0.72.6",
    "@react-native-async-storage/async-storage": "1.18.2",
    "expo-document-picker": "~11.5.4",
    "expo-file-system": "~15.4.5",
    "expo-sharing": "~11.5.0"
  },
  "devDependencies": {
    "@babel/core": "^7.20.0"
  }
}
*/}>CSV/Excel dosyasından veri içe aktar</Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity onPress={excelIndir} style={styles.ayarButon}>
                <Ionicons name="cloud-download-outline" size={24} color="#3b82f6" />
                <View style={styles.ayarButonText}>
                  <Text style={styles.ayarButonBaslik}>Excel İndir</Text>
                  <Text style={styles.ayarButonAlt