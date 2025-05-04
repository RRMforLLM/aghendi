import { HelloWave } from '@/components/HelloWave'
import ParallaxScrollView from '@/components/ParallaxScrollView'
import { ThemedInput } from '@/components/ThemedInput'
import { ThemedText } from '@/components/ThemedText'
import { ThemedView } from '@/components/ThemedView'
import { Button } from '@/components/ui/Button'
import { supabase } from '@/lib/supabase'
import React, { useState } from 'react'
import { Alert, AppState, Image, StyleSheet } from 'react-native'

AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})

export default function Auth() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function signInWithEmail() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    })

    if (error) Alert.alert(error.message)
    setLoading(false)
  }

  async function signUpWithEmail() {
    setLoading(true)
    const {
      data: { user, session },
      error: signUpError,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    })

    if (signUpError) {
      Alert.alert(signUpError.message)
      console.log(signUpError.message)
      setLoading(false)
      return
    }

    if (user) {
      const defaultUsername = email.split('@')[0]
      
      const { error: profileError } = await supabase
        .from('profile')
        .insert([
          { 
            id: user.id,
            username: defaultUsername,
            updated_at: new Date().toISOString()
          }
        ])

      if (profileError) {
        Alert.alert('Error creating profile', profileError.message)
        console.log(profileError.message)
      }
    }

    if (!session) Alert.alert('Please check your inbox for email verification!')
    setLoading(false)
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedText style={styles.subtitle}>Please sign in or create an account to continue</ThemedText>
      
      <ThemedView style={styles.container}>
        <ThemedView style={[styles.verticallySpaced, styles.mt20]}>
          <ThemedText style={styles.label}>Email</ThemedText>
          <ThemedInput
            onChangeText={setEmail}
            value={email}
            placeholder="email@address.com"
            autoCapitalize="none"
          />
        </ThemedView>

        <ThemedView style={styles.verticallySpaced}>
          <ThemedText style={styles.label}>Password</ThemedText>
          <ThemedInput
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            placeholder="Password"
            autoCapitalize="none"
          />
        </ThemedView>

        <ThemedView style={[styles.verticallySpaced, styles.mt20]}>
          <Button
            title="Sign in"
            disabled={loading}
            onPress={() => signInWithEmail()}
            buttonStyle={styles.button}
          />
        </ThemedView>
        
        <ThemedView style={styles.verticallySpaced}>
          <Button
            title="Sign up"
            disabled={loading}
            onPress={() => signUpWithEmail()}
            buttonStyle={styles.button}
            type="outline"
          />
        </ThemedView>
      </ThemedView>
    </ParallaxScrollView>
  )
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  subtitle: {
    gap: 8,
    marginBottom: 0,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  verticallySpaced: {
    paddingTop: 4,
    paddingBottom: 4,
    alignSelf: 'stretch',
  },
  mt20: {
    marginTop: 20,
  },
  headerImage: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  label: {
    marginBottom: 8,
  },
  button: {
    borderRadius: 8,
    padding: 12,
  }
})