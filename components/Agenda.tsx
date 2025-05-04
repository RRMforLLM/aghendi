import { AddItemSheet } from '@/components/agenda/AddItemSheet';
import { AddSubjectSheet } from '@/components/agenda/AddSubjectSheet';
import { AgendaItems } from '@/components/agenda/AgendaItems';
import { AgendaSettings } from '@/components/agenda/AgendaSettings';
import { EditItemSheet } from '@/components/agenda/EditItemSheet';
import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useState } from 'react';
import { Alert, ImageBackground, StyleSheet, View } from 'react-native';

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
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error('Operation failed after all retries');
}

export type Element = {
  id: number;
  details: string;
  priority: 1 | 2 | 3;
  deadline: string;
  subject_id: number | null;
  subject?: {
    name: string | null;
  } | null;
};

type ElementResponse = {
  id: number;
  details: string;
  priority: 1 | 2 | 3;
  deadline: string;
  subject_id: number | null;
  subject: {
    name: string;
  } | null;
};

type Agenda = {
  id: number;
  name: string;
  isEditor: boolean;
  isCreator: boolean;
};

type OpenedAgenda = Agenda & {
  subjects?: any[];
};

interface AgendaProps {
  agenda: OpenedAgenda;
  onClose: () => void;
}

export function Agenda({ agenda, onClose }: AgendaProps) {
  const colorScheme = useColorScheme();
  const [isAddItemVisible, setIsAddItemVisible] = useState(false);
  const [isAddSubjectVisible, setIsAddSubjectVisible] = useState(false);
  const [isEditItemVisible, setIsEditItemVisible] = useState(false);
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Element | null>(null);
  const [editorId, setEditorId] = useState<number | null>(null);
  const [shouldRefreshItems, setShouldRefreshItems] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [items, setItems] = useState<Element[]>([]);
  const [error, setError] = useState({ hasError: false, message: '', isRetrying: false });
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        setIsInitializing(true);
        setIsLoadingItems(true);
        
        if (agenda.isEditor) {
          const editorPromise = supabase
            .from('editor')
            .select('id')
            .eq('agenda_id', agenda.id)
            .single();

          const { data: editor } = await withRetry(async () => {
            return await withTimeout(Promise.resolve(editorPromise), API_TIMEOUT);
          });

          if (editor) {
            setEditorId(editor.id);
          }
        }

        const itemsPromise = supabase
          .from('element')
          .select(`
            id,
            details,
            priority,
            deadline,
            subject_id,
            subject:subject_id (
              name
            )
          `)
          .eq('agenda_id', agenda.id)
          .order('deadline', { ascending: true })
          .order('priority', { ascending: false });

        const { data, error } = await withRetry(async () => {
          return await withTimeout(Promise.resolve(itemsPromise), API_TIMEOUT);
        });
        
        if (error) throw error;
        if (data) {
          const formattedItems = data.map(item => ({
            ...item,
            subject: item.subject || null
          }));
          setItems(formattedItems as Element[]);
        }
      } catch (error: any) {
        console.error('Error initializing agenda:', error);
        setError({
          hasError: true,
          message: 'Failed to load agenda data. Tap to retry.',
          isRetrying: false
        });
      } finally {
        setIsInitializing(false);
        setIsLoadingItems(false);
      }
    };

    initialize();
  }, [agenda.id, agenda.isEditor, shouldRefreshItems]);

  useEffect(() => {
    const fetchAgendaWallpaper = async () => {
      try {
        const { data: agendaData } = await supabase
          .from('agenda')
          .select('wallpaper_url')
          .eq('id', agenda.id)
          .single();

        if (agendaData?.wallpaper_url) {
          setWallpaperUrl(agendaData.wallpaper_url);
        }
      } catch (error) {
        console.error('Error fetching agenda wallpaper:', error);
      }
    };

    fetchAgendaWallpaper();
  }, [agenda.id]);

  const handleRetry = useCallback(() => {
    setError(prev => ({ ...prev, isRetrying: true }));
    setShouldRefreshItems(prev => !prev);
  }, []);

  const handleAddItem = () => {
    setIsAddItemVisible(true);
  };

  const handleAddSubject = () => {
    setIsAddSubjectVisible(true);
  };

  const handleItemAdded = () => {
    setShouldRefreshItems(prev => !prev);
  };

  const handleEditItem = (item: Element) => {
    setSelectedItem(item);
    setIsEditItemVisible(true);
  };

  const handleEditSuccess = () => {
    setShouldRefreshItems(prev => !prev);
    setIsEditItemVisible(false);
    setSelectedItem(null);
  };

  const handleWallpaperUpload = async () => {
    if (!agenda.isCreator) return;

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
        const ext = result.assets[0].uri.split('.').pop();
        const fileName = `agenda-${agenda.id}-${Date.now()}.${ext}`;

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
          .from('agenda')
          .update({ wallpaper_url: publicUrl })
          .eq('id', agenda.id);

        if (updateError) throw updateError;

        setWallpaperUrl(publicUrl);
        Alert.alert('Success', 'Wallpaper updated successfully!');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update wallpaper');
    }
  };

  if (isInitializing || isLoadingItems) {
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

  return (
    <>
      <ParallaxScrollView
        headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
        headerImage={
          <View style={styles.headerWrapper}>
            {wallpaperUrl && (
              <ImageBackground
                source={{ uri: wallpaperUrl }}
                style={styles.headerBackground}
                resizeMode="cover"
              />
            )}
            <ThemedView style={styles.headerContent}>
              <Button
                onPress={() => setIsSettingsVisible(true)}
                type="clear"
                icon={
                  <IconSymbol 
                    name="gearshape.fill" 
                    size={24} 
                    color={Colors[colorScheme ?? 'light'].tint}
                  />
                }
              />
              <ThemedText type="subtitle" style={styles.headerTitle}>
                {agenda.name}
              </ThemedText>
              <Button
                onPress={onClose}
                type="clear"
                icon={
                  <IconSymbol 
                    name="backward.fill" 
                    size={24} 
                    color={Colors[colorScheme ?? 'light'].tint}
                  />
                }
              />
            </ThemedView>
          </View>
        }
        onLongPress={agenda.isCreator ? handleWallpaperUpload : undefined}>
        {(agenda.isEditor || agenda.isCreator) && (
          <ThemedView style={styles.modalButtons}>
            <Button
              title="Add Item"
              onPress={handleAddItem}
              type="solid"
              buttonStyle={styles.button}
              containerStyle={styles.buttonContainer}
            />
            <Button
              title="Create Subject"
              onPress={handleAddSubject}
              type="outline"
              buttonStyle={styles.button}
              containerStyle={styles.buttonContainer}
            />
          </ThemedView>
        )}

        <View style={styles.container}>
          {items.length === 0 ? (
            <ThemedView style={styles.emptyContainer}>
              <ThemedText style={styles.emptyText}>
                No items yet. {agenda.isEditor || agenda.isCreator ? 'Add some items to get started!' : 'Check back later!'}
              </ThemedText>
            </ThemedView>
          ) : (
            <AgendaItems 
              items={items}
              isEditor={agenda.isEditor || agenda.isCreator}
              onRefresh={() => setShouldRefreshItems(prev => !prev)}
              onEditItem={handleEditItem}
            />
          )}
        </View>
      </ParallaxScrollView>

      <AddItemSheet
        isVisible={isAddItemVisible}
        onClose={() => setIsAddItemVisible(false)}
        agendaId={agenda.id}
        onSuccess={handleItemAdded}
      />

      <AddSubjectSheet
        isVisible={isAddSubjectVisible}
        onClose={() => setIsAddSubjectVisible(false)}
        agendaId={agenda.id}
        onSuccess={() => {
        }}
      />

      {selectedItem && (
        <EditItemSheet
          isVisible={isEditItemVisible}
          onClose={() => {
            setIsEditItemVisible(false);
            setSelectedItem(null);
          }}
          agendaId={agenda.id}
          item={selectedItem}
          onSuccess={handleEditSuccess}
        />
      )}

      <AgendaSettings
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
        agendaId={agenda.id}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    position: 'relative',
    height: '100%',
  },
  headerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  buttonContainer: {
    flex: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 16,
    gap: 12,
  },
  button: {
    borderRadius: 8,
    paddingVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    padding: 0,
    gap: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
  },
  deadline: {
    fontSize: 14,
    opacity: 0.8,
  },
  urgentDeadline: {
    color: '#dc3545',
    fontWeight: '600',
  },
  details: {
    fontSize: 16,
    lineHeight: 22,
  },
  priority: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
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
    color: '#007bff',
  },
});