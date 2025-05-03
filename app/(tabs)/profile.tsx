import Auth from '@/components/Auth';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase, supabaseUrl } from '@/lib/supabase';
import { Button } from '@rneui/themed';
import { Session } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, StyleSheet } from 'react-native';

const dbUrl = supabaseUrl

const API_TIMEOUT = 10000;
const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('Request timed out'));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  delayMs: number = RETRY_DELAY
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      console.warn(`Attempt ${attempt + 1} failed:`, error);
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Operation failed after all retries');
}

export default function TabTwoScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState({ hasError: false, message: '', isRetrying: false });
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [backgroundUrl, setBackgroundUrl] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const initializeAuth = async () => {
      setError({ hasError: false, message: '', isRetrying: false });
      try {
        const sessionResult = await withRetry(async () => {
          const sessionPromise = supabase.auth.getSession();
          return await withTimeout(sessionPromise, API_TIMEOUT);
        });

        setSession(sessionResult.data.session);
        if (!sessionResult.data.session) {
          router.replace('/');
        }
      } catch (error: any) {
        console.error('Error initializing auth:', error);
        setError({
          hasError: true,
          message: 'Connection failed. Tap to retry.',
          isRetrying: false
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      try {
        setSession(session);
        if (!session) {
          router.replace('/');
        }
      } catch (error: any) {
        console.error('Error handling auth state change:', error);
        setError({
          hasError: true,
          message: 'Connection error. Tap to retry.',
          isRetrying: false
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [router, retryAttempt]);

  useEffect(() => {
    const fetchUserBackground = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profile')
          .select('background_url')
          .eq('id', user.id)
          .single();

        if (profile?.background_url) {
          setBackgroundUrl(profile.background_url);
        }
      } catch (error) {
        console.error('Error fetching background:', error);
      }
    };

    fetchUserBackground();
  }, [session]);

  const handleRetry = useCallback(() => {
    setError(prev => ({ ...prev, isRetrying: true }));
    setRetryAttempt(prev => prev + 1);
  }, []);

  const handleBackgroundUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant access to your photo library to change the background.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('No user found');

        const ext = result.assets[0].uri.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${ext}`;

        const base64Image = result.assets[0].base64;
        if (!base64Image) throw new Error('No image data');
        
        const arrayBuffer = decode(base64Image);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('backgrounds')
          .upload(fileName, arrayBuffer, {
            contentType: `image/${ext}`,
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('backgrounds')
          .getPublicUrl(fileName);
        
        const { error: updateError } = await supabase
          .from('profile')
          .update({ background_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setBackgroundUrl(publicUrl);
        Alert.alert('Success', 'Background updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update background');
    }
  };

  if (isInitializing) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <LoadingSpinner size={48} />
        {error.hasError && (
          <ThemedView style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error.message}</ThemedText>
            <Button
              title={error.isRetrying ? "Retrying..." : "Retry"}
              onPress={handleRetry}
              disabled={error.isRetrying}
              type="clear"
              titleStyle={styles.retryButton}
            />
          </ThemedView>
        )}
      </ThemedView>
    );
  }

  const handleSignOut = async () => {
    try {
      const { error } = await withTimeout(supabase.auth.signOut(), API_TIMEOUT);
      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error signing out', error.message);
    }
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);
              const sessionResult = await withTimeout(supabase.auth.getSession(), API_TIMEOUT);
              
              if (!sessionResult.data.session?.access_token) {
                throw new Error('No access token found');
              }

              const deleteResponse = await withRetry(async () => {
                const response = await fetch(
                  `${dbUrl}/functions/v1/delete-account`,
                  {
                    method: 'POST',
                    headers: {
                      'Authorization': `Bearer ${sessionResult.data.session!.access_token}`,
                      'Content-Type': 'application/json',
                    },
                  }
                );

                if (!response.ok) {
                  const error = await response.json();
                  throw new Error(error.error || 'Failed to delete account');
                }

                return response;
              });

              await withTimeout(supabase.auth.signOut(), API_TIMEOUT);
            } catch (error: any) {
              Alert.alert('Error', error?.message || 'An unknown error occurred');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        backgroundUrl ? (
          <ImageBackground
            source={{ uri: backgroundUrl }}
            style={styles.headerBackground}
            resizeMode="cover"
          />
        ) : (
          <IconSymbol
            size={310}
            color="#808080"
            name="chevron.left.forwardslash.chevron.right"
            style={styles.headerImage}
          />
        )
      }
      onLongPress={handleBackgroundUpload}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Profile</ThemedText>
      </ThemedView>
      
      <ThemedView style={styles.sessionInfo}>
        <ThemedText>Logged in as: {session.user.email}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.lowerbuttonContainer}>
        <Button
          title="Sign Out"
          onPress={handleSignOut}
          type="outline"
          buttonStyle={styles.signoutButton}
          titleStyle={styles.signoutButtonText}
        />
        <Button
          title="Delete Account"
          onPress={handleDeleteAccount}
          loading={isDeleting}
          buttonStyle={[styles.button, styles.deleteButton]}
          titleStyle={styles.deleteButtonText}
        />
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  headerBackground: {
    width: '100%',
    height: '100%',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionInfo: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  lowerbuttonContainer: {
    marginVertical: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  button: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  signoutButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderColor: '#dc3545',
  },
  signoutButtonText: {
    color: '#dc3545',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderColor: '#dc3545',
  },
  deleteButtonText: {
    color: '#ffffff',
  },
  errorContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#dc3545',
    marginBottom: 8,
  },
  retryButton: {
    color: '#0d6efd',
  },
});
