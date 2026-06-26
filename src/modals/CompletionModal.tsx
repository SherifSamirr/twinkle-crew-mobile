import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import {
	Alert,
	Image,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	StyleSheet,
	TextInput,
	View,
} from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface Props {
	visible: boolean;
	onDismiss: () => void;
	onConfirm: (photoUri: string, note: string | null) => void;
}

export function CompletionModal({ visible, onDismiss, onConfirm }: Props) {
	const [photo, setPhoto] = useState<string | null>(null);
	const [note, setNote] = useState('');
	const theme = useTheme();

	useEffect(() => {
		if (visible) {
			setPhoto(null);
			setNote('');
		}
	}, [visible]);

	const takePhoto = async () => {
		const { status } = await ImagePicker.requestCameraPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Camera access needed', 'Allow camera access in Settings to photograph the setup.');
			return;
		}
		const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.8 });
		if (!result.canceled && result.assets[0]) {
			setPhoto(result.assets[0].uri);
		}
	};

	const pickFromLibrary = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== 'granted') {
			Alert.alert('Photos access needed', 'Allow photos access in Settings to pick a proof photo.');
			return;
		}
		const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.8 });
		if (!result.canceled && result.assets[0]) {
			setPhoto(result.assets[0].uri);
		}
	};

	const handleConfirm = () => {
		if (!photo) return;
		onConfirm(photo, note.trim() || null);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onDismiss}
		>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
				<View style={[styles.sheet, { backgroundColor: theme.background }]}>
					<View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />
					<ThemedText type="subtitle" style={styles.title}>
						Proof of Setup
					</ThemedText>
					<ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
						Attach one photo to mark complete.
					</ThemedText>

					{photo ? (
						<Pressable onPress={() => setPhoto(null)} style={styles.photoPreviewContainer}>
							<Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
							<View style={styles.photoRetakeOverlay}>
								<ThemedText type="small" style={styles.photoRetakeText}>Tap to retake</ThemedText>
							</View>
						</Pressable>
					) : (
						<View style={styles.photoPickerRow}>
							<Pressable
								onPress={takePhoto}
								style={({ pressed }) => [
									styles.cameraBtn,
									{ backgroundColor: theme.backgroundElement },
									pressed && styles.pressed,
								]}
							>
								<ThemedText type="default" style={styles.pickerIcon}>📷</ThemedText>
								<ThemedText type="small" style={styles.pickerLabel}>Camera</ThemedText>
							</Pressable>
							<Pressable
								onPress={pickFromLibrary}
								style={({ pressed }) => [
									styles.libraryBtn,
									{ backgroundColor: theme.backgroundElement },
									pressed && styles.pressed,
								]}
							>
								<ThemedText type="default" style={styles.pickerIcon}>🖼</ThemedText>
								<ThemedText type="small" style={styles.pickerLabel}>Library</ThemedText>
							</Pressable>
						</View>
					)}

					<TextInput
						style={[styles.noteInput, { backgroundColor: theme.backgroundElement, color: theme.text }]}
						placeholder="Note (optional)"
						placeholderTextColor={theme.textSecondary}
						multiline
						numberOfLines={2}
						textAlignVertical="top"
						value={note}
						onChangeText={setNote}
					/>

					<Pressable
						onPress={handleConfirm}
						disabled={!photo}
						style={({ pressed }) => [
							styles.confirmBtn,
							(!photo || pressed) && styles.pressed,
						]}
					>
						<ThemedText type="default" style={styles.confirmBtnText}>
							Mark Complete
						</ThemedText>
					</Pressable>
					<Pressable onPress={onDismiss} style={styles.cancelBtn} hitSlop={8}>
						<ThemedText type="small" themeColor="textSecondary" style={styles.cancelText}>
							Cancel
						</ThemedText>
					</Pressable>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'flex-end',
		backgroundColor: 'rgba(0,0,0,0.45)',
	},
	sheet: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		padding: Spacing.four,
		paddingBottom: Spacing.five,
		gap: Spacing.three,
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: Spacing.one,
	},
	title: {
		marginBottom: Spacing.one,
	},
	subtitle: {
		marginTop: -Spacing.two,
	},
	photoPickerRow: {
		flexDirection: 'row',
		gap: Spacing.two,
	},
	cameraBtn: {
		flex: 2,
		height: 80,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.one,
	},
	libraryBtn: {
		flex: 1,
		height: 80,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
		gap: Spacing.one,
	},
	pickerIcon: {
		fontSize: 24,
	},
	pickerLabel: {
		fontSize: 12,
	},
	photoPreviewContainer: {
		borderRadius: 14,
		overflow: 'hidden',
		height: 160,
	},
	photoPreview: {
		width: '100%',
		height: '100%',
	},
	photoRetakeOverlay: {
		position: 'absolute',
		top: 0, right: 0, bottom: 0, left: 0,
		backgroundColor: 'rgba(0,0,0,0.35)',
		alignItems: 'center',
		justifyContent: 'flex-end',
		paddingBottom: Spacing.two,
	},
	photoRetakeText: {
		color: '#fff',
	},
	noteInput: {
		borderRadius: 12,
		padding: Spacing.three,
		fontSize: 15,
		lineHeight: 22,
		minHeight: 72,
	},
	confirmBtn: {
		height: 60,
		borderRadius: 14,
		backgroundColor: '#10B981',
		alignItems: 'center',
		justifyContent: 'center',
	},
	confirmBtnText: {
		color: '#fff',
		fontSize: 17,
	},
	cancelBtn: {
		alignItems: 'center',
		justifyContent: 'center',
		height: 36,
	},
	cancelText: {
		textAlign: 'center',
	},
	pressed: {
		opacity: 0.6,
	},
});
