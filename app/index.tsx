import { SafeAreaView, StyleSheet, Text, View } from 'react-native';
export default function Home() {
  return <SafeAreaView style={styles.page}><View><Text style={styles.title}>SUN MEDIA</Text><Text style={styles.copy}>Musiqa va media ilovangiz tayyor.</Text></View></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0B1020' }, title: { color: '#fff', fontSize: 32, fontWeight: '800' }, copy: { color: '#B9C2D0', marginTop: 8, fontSize: 16 } });
