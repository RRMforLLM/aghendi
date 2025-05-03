import { BottomSheet } from '@/components/BottomSheet';
import { ThemedInput } from '@/components/ThemedInput';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useColorScheme } from '@/hooks/useColorScheme';
import { supabase } from '@/lib/supabase';
import { Button } from '@rneui/themed';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet } from 'react-native';

interface Member {
  id: string;
  email: string;
  role: 'creator' | 'editor' | 'member';
}

interface AgendaSettingsProps {
  isVisible: boolean;
  onClose: () => void;
  agendaId: number;
}

interface AgendaInfo {
  name: string;
  key: string;
}

export function AgendaSettings({ isVisible, onClose, agendaId }: AgendaSettingsProps) {
  const colorScheme = useColorScheme();
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'creator' | 'editor' | 'member' | null>(null);
  const [agendaInfo, setAgendaInfo] = useState<{ name: string; key: string } | null>(null);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [editMode, setEditMode] = useState<'name' | 'key' | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEditSheet, setShowEditSheet] = useState(false);

  useEffect(() => {
    if (isVisible) {
      fetchAgendaData();
    }
  }, [isVisible]);

  const fetchAgendaData = async () => {
    try {
      setIsLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');
      
      setUser(user);
      
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda')
        .select('name, key, creator_id')
        .eq('id', agendaId)
        .single();

      if (agendaError) throw agendaError;
      setAgendaInfo({ name: agendaData.name, key: agendaData.key });
      
      if (agendaData.creator_id === user.id) {
        setCurrentUserRole('creator');
      } else {
        const { data: editorData } = await supabase
          .from('editor')
          .select('id')
          .eq('agenda_id', agendaId)
          .eq('user_id', user.id)
          .single();

        if (editorData) {
          setCurrentUserRole('editor');
        } else {
          setCurrentUserRole('member');
        }
      }

      const fetchMembers = async () => {
        const membersArray: Member[] = [];

        try {
          const { data: creatorData, error: creatorError } = await supabase
            .from('agenda')
            .select('creator_id')
            .eq('id', agendaId)
            .single();

          if (creatorError) throw creatorError;

          if (creatorData?.creator_id) {
            const { data: creatorProfile } = await supabase
              .from('profile')
              .select('username')
              .eq('id', creatorData.creator_id)
              .single();

            membersArray.push({
              id: creatorData.creator_id,
              email: creatorProfile?.username || 'Unknown',
              role: 'creator'
            });
          }

          const { data: editorsData, error: editorsError } = await supabase
            .from('editor')
            .select('user_id')
            .eq('agenda_id', agendaId);

          if (editorsError) throw editorsError;

          for (const editor of editorsData || []) {
            if (editor.user_id !== creatorData?.creator_id) {
              const { data: editorProfile } = await supabase
                .from('profile')
                .select('username')
                .eq('id', editor.user_id)
                .single();

              if (editorProfile) {
                membersArray.push({
                  id: editor.user_id,
                  email: editorProfile.username,
                  role: 'editor'
                });
              }
            }
          }

          const { data: membersData, error: membersError } = await supabase
            .from('member')
            .select('user_id')
            .eq('agenda_id', agendaId);

          if (membersError) throw membersError;

          for (const member of membersData || []) {
            if (member.user_id !== creatorData?.creator_id && 
                !editorsData?.some(editor => editor.user_id === member.user_id)) {
              const { data: memberProfile } = await supabase
                .from('profile')
                .select('username')
                .eq('id', member.user_id)
                .single();

              if (memberProfile) {
                membersArray.push({
                  id: member.user_id,
                  email: memberProfile.username,
                  role: 'member'
                });
              }
            }
          }

          membersArray.sort((a, b) => {
            const roleWeight = {
              creator: 3,
              editor: 2,
              member: 1
            };
            return roleWeight[b.role] - roleWeight[a.role];
          });

          setMembers(membersArray);
        } catch (error) {
          console.error('Error fetching members:', error);
          Alert.alert('Error', 'Failed to load member information');
        }
      };

      await fetchMembers();
    } catch (error: any) {
      console.error('Error fetching agenda data:', error);
      Alert.alert('Error', 'Failed to load agenda settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLeaveAgenda = () => {
    Alert.alert(
      'Leave Agenda',
      'Are you sure you want to leave this agenda?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) throw new Error('No user found');

              if (currentUserRole === 'editor') {
                await supabase
                  .from('editor')
                  .delete()
                  .eq('agenda_id', agendaId)
                  .eq('user_id', user.id);
              } else if (currentUserRole === 'member') {
                await supabase
                  .from('member')
                  .delete()
                  .eq('agenda_id', agendaId)
                  .eq('user_id', user.id);
              }

              onClose();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to leave agenda');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAgenda = () => {
    Alert.alert(
      'Delete Agenda',
      'This action cannot be undone. All agenda data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('agenda')
                .delete()
                .eq('id', agendaId);

              if (error) throw error;
              onClose();
            } catch (error: any) {
              Alert.alert('Error', 'Failed to delete agenda');
            }
          },
        },
      ]
    );
  };

  const handleLongPress = (member: Member) => {
    if ((currentUserRole === 'editor' || currentUserRole === 'creator') && 
        member.role !== 'creator' && 
        member.id !== user?.id) {
      setSelectedMemberId(member.id);
      setShowActionSheet(true);
    }
  };

  const handlePromoteToEditor = async (memberId: string) => {
    try {
      await supabase
        .from('member')
        .delete()
        .eq('agenda_id', agendaId)
        .eq('user_id', memberId);
      
      await supabase
        .from('editor')
        .insert([{
          agenda_id: agendaId,
          user_id: memberId
        }]);

      fetchAgendaData();
    } catch (error) {
      console.error('Error promoting member:', error);
      Alert.alert('Error', 'Failed to promote member to editor');
    }
  };

  const handleDemoteToMember = async (editorId: string) => {
    try {
      await supabase
        .from('editor')
        .delete()
        .eq('agenda_id', agendaId)
        .eq('user_id', editorId);
      
      await supabase
        .from('member')
        .insert([{
          agenda_id: agendaId,
          user_id: editorId
        }]);

      fetchAgendaData();
    } catch (error) {
      console.error('Error demoting editor:', error);
      Alert.alert('Error', 'Failed to demote editor to member');
    }
  };

  const handleRemoveMember = async (memberId: string, isEditor: boolean) => {
    try {
      if (isEditor) {
        await supabase
          .from('editor')
          .delete()
          .eq('agenda_id', agendaId)
          .eq('user_id', memberId);
      } else {
        await supabase
          .from('member')
          .delete()
          .eq('agenda_id', agendaId)
          .eq('user_id', memberId);
      }

      fetchAgendaData();
    } catch (error) {
      console.error('Error removing member:', error);
      Alert.alert('Error', 'Failed to remove member');
    }
  };

  const handleMemberAction = (action: 'promote' | 'demote' | 'remove') => {
    if (!selectedMemberId) return;

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    const isEditor = member.role === 'editor';

    switch (action) {
      case 'promote':
        Alert.alert(
          'Promote to Editor',
          `Are you sure you want to promote ${member.email} to editor?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Promote',
              onPress: () => handlePromoteToEditor(selectedMemberId)
            }
          ]
        );
        break;

      case 'demote':
        Alert.alert(
          'Demote to Member',
          `Are you sure you want to demote ${member.email} to regular member?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Demote',
              style: 'destructive',
              onPress: () => handleDemoteToMember(selectedMemberId)
            }
          ]
        );
        break;

      case 'remove':
        Alert.alert(
          'Remove Member',
          `Are you sure you want to remove ${member.email} from the agenda?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Remove',
              style: 'destructive',
              onPress: () => handleRemoveMember(selectedMemberId, isEditor)
            }
          ]
        );
        break;
    }

    setShowActionSheet(false);
  };

  const handleInfoLongPress = (type: 'name' | 'key') => {
    if (currentUserRole !== 'creator') return;
    
    setEditMode(type);
    setEditValue(type === 'name' ? agendaInfo?.name || '' : agendaInfo?.key || '');
    setShowEditSheet(true);
  };

  const handleUpdateAgendaInfo = async () => {
    if (!editMode || !editValue.trim()) return;

    try {
      setIsSubmitting(true);

      if (editMode === 'key') {
        const confirmResult = await new Promise((resolve) => {
          Alert.alert(
            'Change Agenda Key',
            'Changing the agenda key will affect how others join this agenda. Make sure to share the new key with all intended members.',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Continue', style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });

        if (!confirmResult) {
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('agenda')
        .update({ [editMode]: editValue.trim() })
        .eq('id', agendaId);

      if (error) throw error;

      setAgendaInfo(prev => prev ? {
        ...prev,
        [editMode]: editValue.trim()
      } : null);

      setShowEditSheet(false);
      setEditMode(null);
      setEditValue('');
    } catch (error: any) {
      Alert.alert('Error', `Failed to update agenda ${editMode}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BottomSheet isVisible={isVisible} onClose={onClose}>
        <ThemedView style={styles.container}>
          <ThemedText type="subtitle" style={styles.title}>Agenda Settings</ThemedText>

          {/* Public Information Section */}
          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">Public Information</ThemedText>
            {agendaInfo && (
              <>
                <Pressable 
                  onLongPress={() => handleInfoLongPress('name')}
                  delayLongPress={500}
                >
                  <ThemedView style={[
                    styles.infoRow,
                    currentUserRole === 'creator' && styles.editableRow
                  ]}>
                    <ThemedText>Name:</ThemedText>
                    <ThemedText type="defaultSemiBold">{agendaInfo.name}</ThemedText>
                  </ThemedView>
                </Pressable>
                <Pressable 
                  onLongPress={() => handleInfoLongPress('key')}
                  delayLongPress={500}
                >
                  <ThemedView style={[
                    styles.infoRow,
                    currentUserRole === 'creator' && styles.editableRow
                  ]}>
                    <ThemedText>Key:</ThemedText>
                    <ThemedText type="defaultSemiBold">{agendaInfo.key}</ThemedText>
                  </ThemedView>
                </Pressable>
              </>
            )}
          </ThemedView>

          {/* Member Management Section */}
          <ThemedView style={styles.section}>
            <ThemedText type="defaultSemiBold">Members</ThemedText>
            <ScrollView style={styles.memberList}>
              {members.map((member) => (
                <Pressable
                  key={member.id}
                  onLongPress={() => handleLongPress(member)}
                  delayLongPress={500}
                >
                  <ThemedView 
                    style={[
                      styles.memberRow,
                      selectedMemberId === member.id && styles.selectedMember
                    ]}
                  >
                    <ThemedText>{member.email}</ThemedText>
                    <ThemedText 
                      style={[
                        styles.roleTag,
                        member.role === 'creator' && (colorScheme === 'dark' ? styles.creatorTagDark : styles.creatorTagLight),
                        member.role === 'editor' && (colorScheme === 'dark' ? styles.editorTagDark : styles.editorTagLight),
                        member.role === 'member' && (colorScheme === 'dark' ? styles.memberTagDark : styles.memberTagLight),
                      ]}
                    >
                      {member.role}
                    </ThemedText>
                  </ThemedView>
                </Pressable>
              ))}
            </ScrollView>
          </ThemedView>

          {/* Action Buttons */}
          <ThemedView style={styles.actionButtons}>
            {currentUserRole !== 'creator' && (
              <Button
                title="Leave Agenda"
                onPress={handleLeaveAgenda}
                type="outline"
                buttonStyle={styles.leaveButton}
                titleStyle={styles.leaveButtonText}
              />
            )}
            
            {currentUserRole === 'creator' && (
              <Button
                title="Delete Agenda"
                onPress={handleDeleteAgenda}
                buttonStyle={styles.deleteButton}
                titleStyle={styles.deleteButtonText}
              />
            )}
          </ThemedView>
        </ThemedView>
      </BottomSheet>

      {/* Member Actions Sheet */}
      <BottomSheet 
        isVisible={showActionSheet} 
        onClose={() => {
          setShowActionSheet(false);
          setSelectedMemberId(null);
        }}
      >
        <ThemedView style={styles.actionSheet}>
          <ThemedText type="subtitle" style={styles.actionSheetTitle}>
            Member Actions
          </ThemedText>
          {selectedMemberId && (
            <ThemedText style={styles.actionSheetSubtitle}>
              {members.find(m => m.id === selectedMemberId)?.email}
            </ThemedText>
          )}
          
          {selectedMemberId && members.find(m => m.id === selectedMemberId)?.role === 'member' && (
            <Button
              title="Promote to Editor"
              onPress={() => handleMemberAction('promote')}
              type="outline"
              buttonStyle={styles.actionButton}
            />
          )}

          {selectedMemberId && members.find(m => m.id === selectedMemberId)?.role === 'editor' && (
            <Button
              title="Demote to Member"
              onPress={() => handleMemberAction('demote')}
              type="outline"
              buttonStyle={styles.actionButton}
            />
          )}

          <Button
            title="Remove from Agenda"
            onPress={() => handleMemberAction('remove')}
            buttonStyle={[styles.actionButton, styles.removeButton]}
            titleStyle={styles.removeButtonText}
          />

          <Button
            title="Cancel"
            onPress={() => {
              setShowActionSheet(false);
              setSelectedMemberId(null);
            }}
            type="clear"
            buttonStyle={styles.actionButton}
          />
        </ThemedView>
      </BottomSheet>

      {/* Edit Info Sheet */}
      <BottomSheet 
        isVisible={showEditSheet} 
        onClose={() => {
          setShowEditSheet(false);
          setEditMode(null);
          setEditValue('');
        }}
      >
        <ThemedView style={styles.actionSheet}>
          <ThemedText type="subtitle" style={styles.actionSheetTitle}>
            Edit Agenda {editMode === 'name' ? 'Name' : 'Key'}
          </ThemedText>
          
          <ThemedView style={styles.inputContainer}>
            <ThemedInput
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter new ${editMode === 'name' ? 'name' : 'key'}`}
              autoCapitalize="none"
              containerStyle={styles.input}
              maxLength={editMode === 'name' ? 30 : 20}
            />
          </ThemedView>

          <ThemedView style={styles.editButtons}>
            <Button
              title="Cancel"
              onPress={() => {
                setShowEditSheet(false);
                setEditMode(null);
                setEditValue('');
              }}
              type="outline"
              buttonStyle={styles.actionButton}
            />
            <Button
              title="Save"
              onPress={handleUpdateAgendaInfo}
              disabled={!editValue.trim() || editValue.trim() === (editMode === 'name' ? agendaInfo?.name : agendaInfo?.key)}
              loading={isSubmitting}
              buttonStyle={styles.actionButton}
            />
          </ThemedView>
        </ThemedView>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  memberList: {
    maxHeight: 200,
    marginTop: 8,
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  roleTag: {
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    overflow: 'hidden',
  },
  creatorTagLight: {
    backgroundColor: '#ffc107',
    color: '#000',
  },
  editorTagLight: {
    backgroundColor: '#17a2b8',
    color: '#fff',
  },
  memberTagLight: {
    backgroundColor: '#e9ecef',
    color: '#000',
  },
  creatorTagDark: {
    backgroundColor: '#856404',
    color: '#fff',
  },
  editorTagDark: {
    backgroundColor: '#0f6674',
    color: '#fff',
  },
  memberTagDark: {
    backgroundColor: '#343a40',
    color: '#fff',
  },
  actionButtons: {
    marginTop: 'auto',
    gap: 8,
  },
  leaveButton: {
    borderColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
  },
  leaveButtonText: {
    color: '#dc3545',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    borderRadius: 8,
    paddingVertical: 12,
  },
  deleteButtonText: {
    color: '#fff',
  },
  selectedMember: {
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  actionSheet: {
    padding: 16,
  },
  actionSheetTitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  actionSheetSubtitle: {
    textAlign: 'center',
    marginBottom: 16,
  },
  actionButton: {
    marginVertical: 4,
    borderRadius: 8,
    paddingVertical: 12,
  },
  removeButton: {
    backgroundColor: '#dc3545',
  },
  removeButtonText: {
    color: '#fff',
  },
  editableRow: {
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  inputContainer: {
    marginBottom: 20,
  },
  input: {
    marginTop: 4,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
});