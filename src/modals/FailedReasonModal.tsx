import { useEffect, useRef, useState } from 'react';
import {
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
	onConfirm: (reason: string) => void;
}

export function FailedReasonModal({ visible, onDismiss, onConfirm }: Props) {
	const [reason, setReason] = useState('');
	const inputRef = useRef<TextInput>(null);
	const theme = useTheme();

	useEffect(() => {
		if (visible) setReason('');
	}, [visible]);

	const handleConfirm = () => {
		const trimmed = reason.trim();
		if (!trimmed) return;
		onConfirm(trimmed);
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="slide"
			onRequestClose={onDismiss}
			onShow={() => inputRef.current?.focus()}
		>
			<KeyboardAvoidingView
				style={styles.overlay}
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
			>
				<Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
				<View style={[styles.sheet, { backgroundColor: theme.background }]}>
					<View style={[styles.handle, { backgroundColor: theme.backgroundElement }]} />
					<ThemedText type="subtitle" style={styles.title}>
						Why couldn't you deliver?
					</ThemedText>
					<TextInput
						ref={inputRef}
						style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
						placeholder="e.g. No access, customer not responding…"
						placeholderTextColor={theme.textSecondary}
						multiline
						numberOfLines={3}
						textAlignVertical="top"
						value={reason}
						onChangeText={setReason}
					/>
					<Pressable
						onPress={handleConfirm}
						disabled={!reason.trim()}
						style={({ pressed }) => [
							styles.confirmBtn,
							(!reason.trim() || pressed) && styles.pressed,
						]}
					>
						<ThemedText type="default" style={styles.confirmBtnText}>
							Confirm Failed
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
	input: {
		borderRadius: 12,
		padding: Spacing.three,
		fontSize: 15,
		lineHeight: 22,
		minHeight: 88,
	},
	confirmBtn: {
		height: 60,
		borderRadius: 14,
		backgroundColor: '#EF4444',
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
