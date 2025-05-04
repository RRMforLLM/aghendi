import { Agenda } from '@/components/Agenda';
import { AgendaCard } from '@/components/AgendaCard';
import Auth from '@/components/Auth';
import { HelloWave } from '@/components/HelloWave';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { TopSheet } from '@/components/TopSheet';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { supabase } from '@/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ImageBackground, StyleSheet } from 'react-native';

type Agenda = {
  id: number;
  name: string;
  isEditor: boolean;
  isCreator: boolean;
};

type OpenedAgenda = Agenda & {
  subjects?: any[];
};

type AgendaAnchorResponse = {
  agenda: {
    id: number;
    name: string;
  };
};

type AgendaMemberResponse = {
  agenda: {
    id: number;
    name: string;
  };
};

type AgendaEditorResponse = {
  agenda: {
    id: number;
    name: string;
  };
};

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

const initialErrorState = {
  hasError: false,
  message: '',
  isRetrying: false
};

export default function HomeScreen() {
  const [session, setSession] = useState<Session | null>(null);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [agendaName, setAgendaName] = useState('');
  const [agendaKey, setAgendaKey] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [joinModalVisible, setJoinModalVisible] = useState(false);
  const [joinAgendaName, setJoinAgendaName] = useState('');
  const [joinAgendaKey, setJoinAgendaKey] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [isLoadingAgendas, setIsLoadingAgendas] = useState(false);
  const [openedAgenda, setOpenedAgenda] = useState<OpenedAgenda | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(initialErrorState);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

  useEffect(() => {
    const initializeApp = async () => {
      setError(initialErrorState);
      setIsInitializing(true);
      
      try {
        const sessionResult = await withRetry(async () => {
          const sessionPromise = supabase.auth.getSession();
          return await withTimeout(sessionPromise, API_TIMEOUT);
        });

        setSession(sessionResult.data.session);
        
        if (sessionResult.data.session?.user) {
          try {
            await withTimeout(checkForAnchoredAgenda(), API_TIMEOUT);
            
            if (!openedAgenda) {
              await withTimeout(fetchAgendas(), API_TIMEOUT);
            }
          } catch (error: any) {
            console.error('Error loading agenda data:', error);
            setError({
              hasError: true,
              message: 'Failed to load agenda data. Tap to retry.',
              isRetrying: false
            });
          }
        }
      } catch (error: any) {
        console.error('Error initializing app:', error);
        setError({
          hasError: true,
          message: 'Connection failed. Tap to retry.',
          isRetrying: false
        });
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setIsInitializing(true);
      setSession(session);
      
      if (session?.user) {
        try {
          await withTimeout(checkForAnchoredAgenda(), API_TIMEOUT);
          if (!openedAgenda) {
            await withTimeout(fetchAgendas(), API_TIMEOUT);
          }
        } catch (error: any) {
          console.error('Error handling auth state change:', error);
          setError({
            hasError: true,
            message: 'Connection error. Tap to retry.',
            isRetrying: false
          });
        }
      }
      setIsInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [retryAttempt]);

  useEffect(() => {
    const fetchUserWallpaper = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profile')
          .select('wallpaper_url')
          .eq('id', user.id)
          .single();

        if (profile?.wallpaper_url) {
          setWallpaperUrl(profile.wallpaper_url);
        }
      } catch (error) {
        console.error('Error fetching wallpaper:', error);
      }
    };

    fetchUserWallpaper();
  }, [session]);

  const handleRetry = useCallback(() => {
    setError(prev => ({ ...prev, isRetrying: true }));
    setRetryAttempt(prev => prev + 1);
  }, []);

  const handleCreateAgenda = async () => {
    if (!agendaName.trim() || !agendaKey.trim()) {
      Alert.alert('Error', 'Please fill in both name and key');
      return;
    }

    try {
      setIsCreating(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: agenda, error: agendaError } = await supabase
        .from('agenda')
        .insert([
          {
            name: agendaName.trim(),
            key: agendaKey.trim(),
            creator_id: user.id,
          }
        ])
        .select()
        .single();

      if (agendaError) throw agendaError;
      
      const { error: editorError } = await supabase
        .from('editor')
        .insert([
          {
            agenda_id: agenda.id,
            user_id: user.id,
          }
        ]);

      if (editorError) throw editorError;

      Alert.alert('Success', 'Agenda created successfully!');
      setCreateModalVisible(false);
      setAgendaName('');
      setAgendaKey('');
      fetchAgendas();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create agenda');
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinAgenda = async () => {
    if (!joinAgendaName.trim() || !joinAgendaKey.trim()) {
      Alert.alert('Error', 'Please fill in both name and key');
      return;
    }

    try {
      setIsJoining(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { data: agenda, error: findError } = await supabase
        .from('agenda')
        .select('id')
        .eq('name', joinAgendaName.trim())
        .eq('key', joinAgendaKey.trim())
        .single();

      if (findError || !agenda) throw new Error('Agenda not found. Please check name and key.');

      const { data: existingMember, error: memberCheckError } = await supabase
        .from('member')
        .select('id')
        .eq('agenda_id', agenda.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) throw new Error('You are already a member of this agenda');

      const { data: existingEditor, error: editorCheckError } = await supabase
        .from('editor')
        .select('id')
        .eq('agenda_id', agenda.id)
        .eq('user_id', user.id)
        .single();

      if (existingEditor) throw new Error('You are already an editor of this agenda');

      const { error: memberError } = await supabase
        .from('member')
        .insert([
          {
            agenda_id: agenda.id,
            user_id: user.id,
          }
        ]);

      if (memberError) throw memberError;

      Alert.alert('Success', 'Successfully joined the agenda!');
      setJoinModalVisible(false);
      setJoinAgendaName('');
      setJoinAgendaKey('');
      fetchAgendas();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join agenda');
    } finally {
      setIsJoining(false);
    }
  };

  const handleWallpaperUpload = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission needed', 'Please grant access to your photo library to change the wallpaper.');
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
          .from('wallpapers')
          .upload(fileName, arrayBuffer, {
            contentType: `image/${ext}`,
          });

        if (uploadError) throw uploadError;
        
        const { data: { publicUrl } } = supabase.storage
          .from('wallpapers')
          .getPublicUrl(fileName);
        
        const { error: updateError } = await supabase
          .from('profile')
          .update({ wallpaper_url: publicUrl })
          .eq('id', user.id);

        if (updateError) throw updateError;

        setWallpaperUrl(publicUrl);
        Alert.alert('Success', 'Wallpaper updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update wallpaper');
    }
  };

  const fetchAgendas = useCallback(async () => {
    try {
      setIsLoadingAgendas(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: memberData, error: memberError } = await supabase
        .from('member')
        .select(`
          agenda:agenda_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id) as { data: AgendaMemberResponse[] | null, error: any };

      if (memberError) throw memberError;
      
      const { data: editorData, error: editorError } = await supabase
        .from('editor')
        .select(`
          agenda:agenda_id (
            id,
            name
          )
        `)
        .eq('user_id', user.id) as { data: AgendaEditorResponse[] | null, error: any };

      if (editorError) throw editorError;
      
      const { data: creatorData, error: creatorError } = await supabase
        .from('agenda')
        .select('id, name')
        .eq('creator_id', user.id);

      if (creatorError) throw creatorError;
      
      const memberAgendas = (memberData || [])
        .map(item => ({
          id: item.agenda.id,
          name: item.agenda.name,
          isEditor: false,
          isCreator: false
        }));

      const editorAgendas = (editorData || [])
        .map(item => ({
          id: item.agenda.id,
          name: item.agenda.name,
          isEditor: true,
          isCreator: false
        }));

      const creatorAgendas = (creatorData || [])
        .map(item => ({
          id: item.id,
          name: item.name,
          isEditor: false,
          isCreator: true
        }));
      
      let mergedAgendas = [...memberAgendas];
      
      editorAgendas.forEach(editorAgenda => {
        const index = mergedAgendas.findIndex(a => a.id === editorAgenda.id);
        if (index >= 0) {
          mergedAgendas[index] = editorAgenda;
        } else {
          mergedAgendas.push(editorAgenda);
        }
      });

      creatorAgendas.forEach(creatorAgenda => {
        const index = mergedAgendas.findIndex(a => a.id === creatorAgenda.id);
        if (index >= 0) {
          mergedAgendas[index] = creatorAgenda;
        } else {
          mergedAgendas.push(creatorAgenda);
        }
      });

      mergedAgendas.sort((a, b) => {
        const getRoleWeight = (agenda: Agenda) => {
          if (agenda.isCreator) return 3;
          if (agenda.isEditor) return 2;
          return 1;
        };

        return getRoleWeight(b) - getRoleWeight(a);
      });

      setAgendas(mergedAgendas);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to fetch agendas');
    } finally {
      setIsLoadingAgendas(false);
    }
  }, []);

  const checkForAnchoredAgenda = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: anchorData, error: anchorError } = await supabase
        .from('agenda_anchor')
        .select(`
          agenda:agenda_id (
            id,
            name
          )
        `)
        .eq('whom_id', user.id)
        .single() as { data: AgendaAnchorResponse | null, error: any };

      if (anchorError) {
        if (anchorError.code !== 'PGRST116') {
          throw anchorError;
        }
        return;
      }

      if (anchorData?.agenda) {
        const { data: editorData } = await supabase
          .from('editor')
          .select('id')
          .eq('agenda_id', anchorData.agenda.id)
          .eq('user_id', user.id)
          .single();

        const { data: creatorData } = await supabase
          .from('agenda')
          .select('id')
          .eq('id', anchorData.agenda.id)
          .eq('creator_id', user.id)
          .single();

        setOpenedAgenda({
          id: anchorData.agenda.id,
          name: anchorData.agenda.name,
          isEditor: !!editorData,
          isCreator: !!creatorData
        });
      }
    } catch (error: any) {
      console.error('Error checking for anchored agenda:', error);
    }
  };

  const handleOpenAgenda = async (agenda: Agenda) => {
    try {
      setIsInitializing(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: anchorError } = await supabase
        .from('agenda_anchor')
        .insert([
          {
            agenda_id: agenda.id,
            whom_id: user.id,
          }
        ]);

      if (anchorError) throw anchorError;
      
      setOpenedAgenda(agenda);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open agenda');
    } finally {
      setIsInitializing(false);
    }
  };

  const handleCloseAgenda = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error: anchorError } = await supabase
        .from('agenda_anchor')
        .delete()
        .eq('agenda_id', openedAgenda?.id)
        .eq('whom_id', user.id);

      if (anchorError) throw anchorError;
      
      setOpenedAgenda(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to close agenda');
    }
  };

  const getCardsPerRow = (totalAgendas: number) => {
    if (totalAgendas === 1) return 1;
    if (totalAgendas === 2) return 2;
    return 3;
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

  if (!session) {
    return <Auth />;
  }

  if (openedAgenda) {
    return <Agenda agenda={openedAgenda} onClose={handleCloseAgenda} />;
  }

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        wallpaperUrl ? (
          <ImageBackground
            source={{ uri: wallpaperUrl }}
            style={styles.headerBackground}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('@/assets/images/partial-react-logo.png')}
            style={styles.headerImage}
          />
        )
      }
      onLongPress={handleWallpaperUpload}>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>

      <ThemedView style={styles.modalButtons}>
        <Button
          title="Create Agenda"
          onPress={() => setCreateModalVisible(true)}
          type="solid"
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
        <Button
          title="Join Agenda"
          onPress={() => setJoinModalVisible(true)}
          type="outline"
          buttonStyle={styles.button}
          containerStyle={styles.buttonContainer}
        />
      </ThemedView>

      <ThemedView style={styles.agendasContainer}>
        {isLoadingAgendas ? (
          <ThemedView style={styles.loadingContainer}>
            <LoadingSpinner size={36} />
          </ThemedView>
        ) : agendas.length === 0 ? (
          <ThemedText style={styles.noAgendas}>
            You haven't joined any agendas yet. Create one or join an existing agenda to get started!
          </ThemedText>
        ) : (
          <ThemedView style={styles.agendaGrid}>
            {agendas.map(agenda => (
              <AgendaCard
                key={agenda.id}
                name={agenda.name}
                isEditor={agenda.isEditor}
                isCreator={agenda.isCreator}
                totalInRow={getCardsPerRow(agendas.length)}
                onPress={() => handleOpenAgenda(agenda)}
              />
            ))}
          </ThemedView>
        )}
      </ThemedView>

      <TopSheet
        isVisible={createModalVisible}
        onClose={() => {
          setCreateModalVisible(false);
          setAgendaName('');
          setAgendaKey('');
        }}
      >
        <ThemedText type="subtitle" style={styles.modalTitle}>Create New Agenda</ThemedText>
        
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Agenda Name</ThemedText>
          <ThemedInput
            value={agendaName}
            onChangeText={setAgendaName}
            placeholder="Enter agenda name"
            autoCapitalize="none"
            containerStyle={styles.input}
            maxLength={30}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Access Key</ThemedText>
          <ThemedInput
            value={agendaKey}
            onChangeText={setAgendaKey}
            placeholder="Enter access key"
            autoCapitalize="none"
            containerStyle={styles.input}
            maxLength={20}
          />
        </ThemedView>

        <ThemedView style={styles.modalButtons}>
          <Button
            title="Cancel"
            onPress={() => {
              setCreateModalVisible(false);
              setAgendaName('');
              setAgendaKey('');
            }}
            type="outline"
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
          <Button
            title="Create"
            onPress={handleCreateAgenda}
            disabled={!agendaName.trim() || !agendaKey.trim()}
            loading={isCreating}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
        </ThemedView>
      </TopSheet>

      <TopSheet
        isVisible={joinModalVisible}
        onClose={() => {
          setJoinModalVisible(false);
          setJoinAgendaName('');
          setJoinAgendaKey('');
        }}
      >
        <ThemedText type="subtitle" style={styles.modalTitle}>Join Agenda</ThemedText>
        
        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Agenda Name</ThemedText>
          <ThemedInput
            value={joinAgendaName}
            onChangeText={setJoinAgendaName}
            placeholder="Enter agenda name"
            autoCapitalize="none"
            containerStyle={styles.input}
            maxLength={30}
          />
        </ThemedView>

        <ThemedView style={styles.inputContainer}>
          <ThemedText style={styles.label}>Access Key</ThemedText>
          <ThemedInput
            value={joinAgendaKey}
            onChangeText={setJoinAgendaKey}
            placeholder="Enter access key"
            autoCapitalize="none"
            containerStyle={styles.input}
            maxLength={20}
          />
        </ThemedView>

        <ThemedView style={styles.modalButtons}>
          <Button
            title="Cancel"
            onPress={() => {
              setJoinModalVisible(false);
              setJoinAgendaName('');
              setJoinAgendaKey('');
            }}
            type="outline"
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
          <Button
            title="Join"
            onPress={handleJoinAgenda}
            disabled={!joinAgendaName.trim() || !joinAgendaKey.trim()}
            loading={isJoining}
            buttonStyle={styles.button}
            containerStyle={styles.buttonContainer}
          />
        </ThemedView>
      </TopSheet>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Create an <ThemedText type="defaultSemiBold">agenda</ThemedText> to get started.
          Invite other people by sharing the <ThemedText type="defaultSemiBold">key</ThemedText> with them.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 2: Explore</ThemedText>
        <ThemedText>
          Tap the Profile tab to learn more about what's included in your account.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          When you're ready, begin building your own agendas.
          {' '}<ThemedText type="defaultSemiBold">Members</ThemedText> can consult them.
          While <ThemedText type="defaultSemiBold">editors</ThemedText> are managing them.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  headerImage: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
    zIndex: 1,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  modalTitle: {
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    marginTop: 4,
  },
  label: {
    marginBottom: 4,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  buttonContainer: {
    flex: 1,
  },
  agendasContainer: {
    marginTop: 24,
    marginBottom: 16,
  },
  noAgendas: {
    textAlign: 'center',
    marginHorizontal: 32,
  },
  agendaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    paddingLeft: 8,
  },
  closeIcon: {
    transform: [{ rotate: '-90deg' }],
  },
  placeholder: {
    textAlign: 'center',
    marginTop: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
});
