import { router, useLocalSearchParams } from 'expo-router';
import { type ReactNode, useState } from 'react';
import {
	ActivityIndicator,
	Image,
	Linking,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	View,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { StatusBadge } from '@/components/stopCard';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { NEXT_COLOR, NEXT_LABEL, NEXT_STATUS } from '@/constants/status';
import { Spacing } from '@/constants/theme';
import { useStopDetail } from '@/hooks/useStopDetail';
import { useTheme } from '@/hooks/use-theme';
import { CompletionModal } from '@/modals/CompletionModal';
import { FailedReasonModal } from '@/modals/FailedReasonModal';



const PENDING_COLOR = '#F59E0B';

function InfoSection({ title, children, pending }: { title: string; children: ReactNode; pending?: boolean }) {
	const theme = useTheme();
	return (
		<View style={[
			styles.section,
			{ backgroundColor: theme.backgroundElement },
			pending && styles.sectionPending,
		]}>
			<View style={styles.sectionTitleRow}>
				<ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>
					{title}
				</ThemedText>
				{pending && (
					<ThemedText type="small" style={styles.pendingTag}>Pending sync</ThemedText>
				)}
			</View>
			{children}
		</View>
	);
}

function InfoRow({ label, value }: { label: string; value: string }) {
	return (
		<View style={styles.infoRow}>
			<ThemedText type="small" themeColor="textSecondary" style={styles.infoLabel}>
				{label}
			</ThemedText>
			<ThemedText type="small" style={styles.infoValue}>
				{value}
			</ThemedText>
		</View>
	);
}

export default function OrderDetailsScreen() {
	const { id } = useLocalSearchParams<{ id: string }>();
	const { stop, hasPendingSync, loading, error, enqueueUpdate } = useStopDetail(id);
	const [updating, setUpdating] = useState(false);
	const [showFailedModal, setShowFailedModal] = useState(false);
	const [showCompleteModal, setShowCompleteModal] = useState(false);
	const theme = useTheme();

	const advance = async () => {
		if (!stop || updating) return;
		const next = NEXT_STATUS[stop.status];
		if (!next) return;
		setUpdating(true);
		await enqueueUpdate(stop.id, next);
		setUpdating(false);
	};

	const confirmFailed = async (reason: string) => {
		if (!stop) return;
		setShowFailedModal(false);
		setUpdating(true);
		await enqueueUpdate(stop.id, 'failed', reason);
		setUpdating(false);
	};

	const confirmComplete = async (photoUri: string, note: string | null) => {
		if (!stop) return;
		setShowCompleteModal(false);
		setUpdating(true);
		await enqueueUpdate(stop.id, 'completed', undefined, photoUri, note);
		setUpdating(false);
	};

	const openInMaps = () => {
		if (!stop) return;
		const url = Platform.select({
			ios: `maps://?daddr=${stop.lat},${stop.lng}`,
			android: `geo:${stop.lat},${stop.lng}?q=${stop.lat},${stop.lng}`,
			default: `https://www.google.com/maps/dir/?api=1&destination=${stop.lat},${stop.lng}`,
		});
		if (url) Linking.openURL(url);
	};

	if (loading) {
		return (
			<ThemedView style={styles.centered}>
				<ActivityIndicator />
			</ThemedView>
		);
	}

	if (error || !stop) {
		return (
			<ThemedView style={styles.centered}>
				<Pressable onPress={() => router.back()} style={styles.backInError} hitSlop={8}>
					<ThemedText type="small" themeColor="textSecondary">← Orders</ThemedText>
				</Pressable>
				<ThemedText type="small" themeColor="textSecondary">
					{error ?? 'Order not found'}
				</ThemedText>
			</ThemedView>
		);
	}

	const isTerminal = stop.status === 'completed' || stop.status === 'failed';
	const nextStatus = NEXT_STATUS[stop.status];

	return (
		<ThemedView style={styles.screen}>
			<View style={[styles.navBar, { borderBottomColor: theme.backgroundElement }]}>
				<Pressable onPress={() => router.back()} hitSlop={8}>
					<ThemedText type="default">← Orders</ThemedText>
				</Pressable>
				<View style={styles.navRight}>
					<StatusBadge status={stop.status} />
					{hasPendingSync && (
						<ThemedText type="small" style={styles.pendingLabel}>
							Pending
						</ThemedText>
					)}
				</View>
			</View>

			<ScrollView
				contentContainerStyle={[styles.content, isTerminal && styles.contentNoActions]}
				showsVerticalScrollIndicator={false}
			>
				<ThemedText type="subtitle" style={styles.customerName}>
					{stop.customer}
				</ThemedText>
				<ThemedText type="small" themeColor="textSecondary" style={styles.orderId}>
					{stop.id}
				</ThemedText>

				<InfoSection title="DELIVERY">
					<InfoRow label="Finish by" value={stop.must_finish_by} />
					<InfoRow label="Address" value={stop.address + ', ' + stop.area} />
					<Pressable onPress={openInMaps}>
						<View style={styles.mapContainer}>
							<MapView
								style={styles.map}
								initialRegion={{
									latitude: stop.lat,
									longitude: stop.lng,
									latitudeDelta: 0.01,
									longitudeDelta: 0.01,
								}}
								scrollEnabled={false}
								zoomEnabled={false}
								pitchEnabled={false}
								rotateEnabled={false}
							>
								<Marker coordinate={{ latitude: stop.lat, longitude: stop.lng }} />
							</MapView>
							<View style={StyleSheet.absoluteFill} />
						</View>
					</Pressable>
				</InfoSection>

				<InfoSection title="ITEMS TO INSTALL">
					{stop.items.map((item, i) => (
						<View key={i} style={styles.itemRow}>
							<View style={[styles.itemBullet, { backgroundColor: theme.textSecondary }]} />
							<ThemedText type="small" style={styles.itemText}>{item}</ThemedText>
						</View>
					))}
				</InfoSection>

				{stop.notes && !stop.proof_photo_url ? (
					<InfoSection title="NOTES">
						<ThemedText type="small">{stop.notes}</ThemedText>
					</InfoSection>
				) : null}

				{stop.proof_photo_url ? (
					<InfoSection title="PROOF OF SETUP" pending={hasPendingSync}>
						<Image
							source={{ uri: stop.proof_photo_url }}
							style={styles.proofImage}
							resizeMode="cover"
						/>
						{stop.notes ? (
							<ThemedText type="small" themeColor="textSecondary" style={styles.proofNote}>
								{stop.notes}
							</ThemedText>
						) : null}
					</InfoSection>
				) : null}

				{stop.status === 'failed' && stop.failed_reason ? (
					<InfoSection title="FAILED REASON" pending={hasPendingSync}>
						<ThemedText type="small" style={styles.failedReason}>
							{stop.failed_reason}
						</ThemedText>
					</InfoSection>
				) : null}
			</ScrollView>

			{/* Action bar — only shown for non-terminal statuses */}
			{!isTerminal && (
				<View style={[styles.actionBar, { backgroundColor: theme.background, borderTopColor: theme.backgroundElement }]}>
					{nextStatus && (
						<Pressable
							onPress={stop.status === 'arrived' ? () => setShowCompleteModal(true) : advance}
							disabled={updating}
							style={({ pressed }) => [
								styles.primaryBtn,
								{ backgroundColor: NEXT_COLOR[stop.status] },
								(updating || pressed) && styles.btnPressed,
							]}
						>
							{updating
								? <ActivityIndicator color="#fff" />
								: (
									<ThemedText type="default" style={styles.primaryBtnText}>
										{NEXT_LABEL[stop.status]}
									</ThemedText>
								)
							}
						</Pressable>
					)}
					<Pressable
						onPress={() => setShowFailedModal(true)}
						disabled={updating}
						style={({ pressed }) => [styles.failedBtn, pressed && styles.btnPressed]}
						hitSlop={8}
					>
						<ThemedText type="small" style={styles.failedBtnText}>
							Mark as Failed
						</ThemedText>
					</Pressable>
				</View>
			)}

			<FailedReasonModal
				visible={showFailedModal}
				onDismiss={() => setShowFailedModal(false)}
				onConfirm={confirmFailed}
			/>

			<CompletionModal
				visible={showCompleteModal}
				onDismiss={() => setShowCompleteModal(false)}
				onConfirm={confirmComplete}
			/>
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	screen: {
		flex: 1,
	},
	centered: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	backInError: {
		position: 'absolute',
		top: Spacing.four,
		left: Spacing.three,
	},
	navBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: Spacing.three,
		paddingVertical: Spacing.two,
		borderBottomWidth: StyleSheet.hairlineWidth,
	},
	navRight: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: Spacing.two,
	},
	pendingLabel: {
		color: '#F59E0B',
		fontSize: 12,
	},
	content: {
		padding: Spacing.three,
		paddingBottom: 120,
	},
	contentNoActions: {
		paddingBottom: Spacing.six,
	},
	customerName: {
		marginBottom: Spacing.one,
	},
	orderId: {
		marginBottom: Spacing.three,
	},
	section: {
		borderRadius: Spacing.three,
		padding: Spacing.three,
		marginBottom: Spacing.two,
	},
	sectionPending: {
		borderWidth: 1,
		borderColor: PENDING_COLOR,
	},
	sectionTitleRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: Spacing.two,
	},
	sectionTitle: {
		letterSpacing: 0.8,
	},
	pendingTag: {
		color: PENDING_COLOR,
		fontSize: 11,
	},
	infoRow: {
		flexDirection: 'row',
		paddingVertical: Spacing.one,
		gap: Spacing.two,
	},
	infoLabel: {
		width: 72,
		flexShrink: 0,
	},
	infoValue: {
		flex: 1,
	},
	itemRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingVertical: Spacing.one,
		gap: Spacing.two,
	},
	itemBullet: {
		width: 5,
		height: 5,
		borderRadius: 3,
		marginTop: 8,
		flexShrink: 0,
	},
	itemText: {
		flex: 1,
	},
	proofImage: {
		width: '100%',
		aspectRatio: 4 / 3,
		borderRadius: Spacing.two,
	},
	proofNote: {
		marginTop: Spacing.two,
	},
	failedReason: {
		color: '#EF4444',
	},
	badge: {
		paddingHorizontal: Spacing.two,
		paddingVertical: 3,
		borderRadius: Spacing.two,
	},
	badgeLabel: {
		fontSize: 12,
		lineHeight: 16,
	},
	mapContainer: {
		height: 160,
		borderRadius: Spacing.two,
		overflow: 'hidden',
		marginTop: Spacing.two,
	},
	map: {
		flex: 1,
	},
	actionBar: {
		paddingHorizontal: Spacing.three,
		paddingTop: Spacing.two,
		paddingBottom: Spacing.four,
		borderTopWidth: StyleSheet.hairlineWidth,
		gap: Spacing.two,
	},
	primaryBtn: {
		height: 60,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryBtnText: {
		color: '#fff',
		fontSize: 17,
	},
	failedBtn: {
		height: 44,
		alignItems: 'center',
		justifyContent: 'center',
	},
	failedBtnText: {
		color: '#EF4444',
	},
	btnPressed: {
		opacity: 0.6,
	},
});
