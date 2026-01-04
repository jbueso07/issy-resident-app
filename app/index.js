// app/index.js
// ISSY - Animated Splash Screen
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { View, StyleSheet, Animated } from 'react-native';
import { useAuth } from '../src/context/AuthContext';

export default function Index() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [animationDone, setAnimationDone] = useState(false);

  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(400),
    ]).start(() => setAnimationDone(true));
  }, []);

  useEffect(() => {
    if (!loading && animationDone) {
      if (user) {
        router.replace('/(tabs)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, loading, animationDone]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/icon.png')}
        style={[
          styles.logo,
          {
            opacity,
            transform: [{ scale }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1A1E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 160,
    height: 160,
  },
});