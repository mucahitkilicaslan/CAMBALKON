import React, { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, View, Text, TextInput, Pressable, StyleSheet, SafeAreaView } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculate } from './src/calculations';

const initial = { customer:'', project:'', width:'1000', height:'1650', panels:'4', profileW:'0', sealW:'0', gapW:'0', profileH:'0', sealH:'0', gapH:'0', price:'3500', installation:'0', transport:'0', other:'0', discount:'0', vat:'20' };
const format = (n, digits=2) => n.toLocaleString('tr-TR',{minimumFractionDigits:digits,maximumFractionDigits:digits});
function Field({label,value,onChangeText}) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={label.includes('Müşteri')||label.includes('Proje')?'default':'decimal-pad'} placeholder="0" /></View>; }
function PanelDrawing({calc}) {
 const n=calc.panels, x=22, y=18, w=294, h=165, pw=w/n;
 return <View style={styles.drawing}><Text style={styles.section}>Ölçüye Göre Panel Çizimi</Text><Svg width="100%" height={245} viewBox="0 0 340 245">
 {Array.from({length:n},(_,i)=><React.Fragment key={i}><Rect x={x+i*pw+1} y={y} width={Math.max(1,pw-2)} height={h} fill="#D6EDF8" stroke="#1F6289" strokeWidth="1.4"/><Line x1={x+i*pw+3} y1={y+5} x2={x+(i+1)*pw-3} y2={y+h-5} stroke="#FFFFFF" strokeWidth="1.4"/>{pw>19&&<SvgText x={x+(i+.5)*pw} y={y+80} textAnchor="middle" fontSize={pw>35?11:8} fill="#174769">{i+1}</SvgText>}</React.Fragment>)}
 <Line x1={x} y1={199} x2={x+w} y2={199} stroke="#1B3C57"/><Line x1={x} y1={194} x2={x} y2={204} stroke="#1B3C57"/><Line x1={x+w} y1={194} x2={x+w} y2={204} stroke="#1B3C57"/><SvgText x={169} y={218} textAnchor="middle" fontSize={12} fill="#1B3C57">Toplam: {format(calc.width,0)} mm</SvgText><SvgText x={169} y={236} textAnchor="middle" fontSize={11} fill="#1B3C57">Panel: {format(calc.panelWidth,1)} × {format(calc.height,0)} mm</SvgText>
 </Svg><Text style={styles.note}>Paneller toplam açıklığa göre orantılı çizilir. Yükseklik şematik gösterilir; çizim imalat ölçeğinde değildir.</Text></View>;
}
export default function App() {
 const [data,setData] = useState(initial);
 const [loaded,setLoaded] = useState(false);
 useEffect(()=>{AsyncStorage.getItem('camBalkonProDraft').then(s=>{if(s) setData({...initial,...JSON.parse(s)});}).catch(()=>{}).finally(()=>setLoaded(true));},[]);
 useEffect(()=>{if(loaded) AsyncStorage.setItem('camBalkonProDraft',JSON.stringify(data)).catch(()=>{});},[data,loaded]);
 const set=(key)=>(value)=>setData(d=>({...d,[key]:value}));
 const calc=useMemo(()=>calculate(data),[data]);
 const field=(key,label)=><Field key={key} label={label} value={data[key]} onChangeText={set(key)}/>;
 return <SafeAreaView style={styles.root}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
 <Text style={styles.brand}>CAM BALKON PRO</Text><Text style={styles.title}>Katlanır Cam Balkon</Text><Text style={styles.subtitle}>Temperli cam · m² fiyatlandırma</Text>
 <View style={styles.card}><Text style={styles.section}>Müşteri ve Proje</Text>{field('customer','Müşteri Adı')}{field('project','Proje / Uygulama Yeri')}</View>
 <View style={styles.card}><Text style={styles.section}>Ölçüler (mm)</Text><View style={styles.two}>{field('width','Toplam Genişlik (mm)')}{field('height','Yükseklik (mm)')}</View>{field('panels','Panel Adedi')}<Text style={styles.value}>Brüt panel: {format(calc.panelWidth,1)} × {format(calc.height,1)} mm</Text></View>
 <View style={styles.card}><Text style={styles.section}>Manuel Kesim Payları (mm)</Text><Text style={styles.subheading}>En payları</Text><View style={styles.three}>{field('profileW','Profil - En')}{field('sealW','Fitil - En')}{field('gapW','Boşluk - En')}</View><Text style={styles.subheading}>Boy payları</Text><View style={styles.three}>{field('profileH','Profil - Boy')}{field('sealH','Fitil - Boy')}{field('gapH','Boşluk - Boy')}</View><Text style={styles.value}>Net cam kesimi: {format(calc.netWidth,1)} × {format(calc.netHeight,1)} mm</Text>{!calc.valid&&<Text style={styles.error}>Ölçüler pozitif olmalı ve kesim payları panel ölçüsünü aşmamalıdır.</Text>}</View>
 <PanelDrawing calc={calc}/>
 <View style={styles.card}><Text style={styles.section}>Teklif Hesabı</Text><Text style={styles.value}>Toplam alan: {format(calc.area)} m²</Text>{field('price','Birim Fiyat (TL/m²)')}<View style={styles.two}>{field('installation','Montaj (TL)')}{field('transport','Nakliye (TL)')}</View>{field('other','Diğer (TL)')}<View style={styles.two}>{field('discount','İskonto (%)')}{field('vat','KDV (%)')}</View><View style={styles.divider}/><Text>Cam balkon: {format(calc.material)} TL</Text><Text>İskonto: −{format(calc.discount)} TL</Text><Text>Ara toplam: {format(calc.subtotal)} TL</Text><Text>KDV: {format(calc.vat)} TL</Text><Text style={styles.total}>GENEL TOPLAM: {format(calc.total)} TL</Text></View>
 <Pressable style={styles.button} onPress={()=>Alert.alert('Taslak kaydedildi','Girdiğiniz bilgiler cihazda otomatik saklanıyor.')}><Text style={styles.buttonText}>Taslağı Kaydet</Text></Pressable>
 <Text style={styles.note}>Hesaplama varsayımı: eşit panel genişliği; manuel paylar her panelin en/boy ölçüsünden bir kez düşülür. Üretim öncesi sistemin teknik kesim kurallarıyla doğrulayın. PDF ve çoklu proje yönetimi sonraki sürümdedir.</Text>
 </ScrollView></SafeAreaView>;
}
const styles=StyleSheet.create({root:{flex:1,backgroundColor:'#F3F6FA'},content:{padding:18,paddingBottom:55},brand:{fontSize:12,fontWeight:'800',letterSpacing:2,color:'#326D96'},title:{fontSize:27,fontWeight:'800',color:'#14354D',marginTop:5},subtitle:{fontSize:13,color:'#62788B',marginBottom:16},card:{backgroundColor:'#FFFFFF',borderRadius:16,padding:15,marginBottom:13,borderWidth:1,borderColor:'#E1E8EF'},section:{fontSize:17,fontWeight:'800',color:'#173D59',marginBottom:12},field:{flex:1,marginBottom:10,minWidth:0},label:{fontSize:11,fontWeight:'700',color:'#536B7C',marginBottom:5},input:{borderWidth:1,borderColor:'#CCD9E4',borderRadius:9,paddingHorizontal:10,paddingVertical:9,fontSize:15,color:'#12344D',backgroundColor:'#FBFDFF'},two:{flexDirection:'row',gap:10},three:{flexDirection:'row',gap:6},subheading:{fontWeight:'700',color:'#35566C',marginBottom:7},value:{fontWeight:'800',color:'#164F77',fontSize:15,marginVertical:8},drawing:{backgroundColor:'#FFFFFF',borderRadius:16,padding:15,marginBottom:13,borderWidth:1,borderColor:'#E1E8EF'},note:{color:'#697C8A',fontSize:11,lineHeight:17,marginTop:7},error:{color:'#C0392B',fontWeight:'700'},divider:{height:1,backgroundColor:'#E4EAF0',marginVertical:12},total:{fontSize:19,fontWeight:'900',color:'#13633C',marginTop:13},button:{backgroundColor:'#205E85',padding:16,borderRadius:12,alignItems:'center'},buttonText:{color:'#FFF',fontWeight:'800',fontSize:15}});
