import { type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedViewProps = ViewProps & {
	lightColor?: string;
	darkColor?: string;
	type?: ThemeColor;
};

export function ThemedView({ style, lightColor, darkColor, type, ...otherProps }: ThemedViewProps) {
	const theme = useTheme();
	const bgStyle = { backgroundColor: theme[type ?? 'background'] };


	return <SafeAreaView style={[bgStyle, style]} {...otherProps} />;

}
