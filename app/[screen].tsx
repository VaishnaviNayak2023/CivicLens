import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Image, PanResponder, Pressable, StyleSheet, TextInput, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { supabase } from '@/services/supabase';
import { colors } from '@/design-tokens';
import { hotspots, primaryFlow, screenById, screens, tabDestinations } from '@/screens';
import { useSessionStore, type CivicRole } from '@/state';

const REFERENCE_RATIO = 1170 / 2532;
const signInSchema = z.object({ identifier: z.string().trim().min(1), password: z.string() });
const resetPasswordSchema = z.object({
  newPassword: z.string().min(8).regex(/\d/),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ['confirmPassword'] });

const destinations = Object.values(tabDestinations);

export default function ReferenceScreen() {
  const { screen: routeScreen } = useLocalSearchParams<{ screen: string }>();
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const role = useSessionStore((state) => state.role);
  const setRole = useSessionStore((state) => state.setRole);
  const authIdentifier = useSessionStore((state) => state.authIdentifier);
  const setAuthIdentifier = useSessionStore((state) => state.setAuthIdentifier);
  const setDraftPhotoUri = useSessionStore((state) => state.setDraftPhotoUri);
  const setCoordinates = useSessionStore((state) => state.setCoordinates);
  const authForm = useForm({ resolver: zodResolver(signInSchema), defaultValues: { identifier: authIdentifier, password: '' } });
  const identifier = authForm.watch('identifier');
  const password = authForm.watch('password');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const current = screenById(routeScreen ?? '') ?? screenById('sign-in')!;
  const index = screens.findIndex((screen) => screen.id === current.id);
  const contentWidth = Math.min(width, height * REFERENCE_RATIO);
  const contentHeight = contentWidth / REFERENCE_RATIO;
  const hasTabs = ['home', 'home-evening', 'home-updates', 'map-search', 'road-results', 'map-filters', 'nearby-issues', 'saved-items', 'my-activity', 'my-complaints', 'empty-complaints'].includes(current.id);

  const go = (id: string) => router.push(`/${id}` as Href);
  const landingForRole = () => role === 'engineer' ? 'engineer-jobs' : role === 'officer' ? 'officer-queue' : role === 'auditor' ? 'public-lookup' : 'home';
  const goNext = () => {
    const defaultNext = landingForRole();
    const next = current.id === 'sign-in' ? defaultNext : primaryFlow[current.id] ?? screens[(index + 1) % screens.length]?.id;
    if (next) go(next);
  };
  const goBack = () => router.back();
  const handleSignIn = async () => {
    if (!await authForm.trigger()) return go('error');
    const values = authForm.getValues();
    if (!supabase) return go(landingForRole());
    setAuthIdentifier(values.identifier.trim());
    try {
      const result = role === 'citizen'
        ? values.identifier.includes('@')
          ? await supabase.auth.signInWithOtp({ email: values.identifier.trim(), options: { shouldCreateUser: true } })
          : await supabase.auth.signInWithOtp({ phone: values.identifier.trim(), options: { shouldCreateUser: true } })
        : values.identifier.includes('@')
          ? await supabase.auth.signInWithPassword({ email: values.identifier.trim(), password: values.password })
          : await supabase.auth.signInWithPassword({ phone: values.identifier.trim(), password: values.password });
      if (result.error) return go('error');
      go(role === 'citizen' ? 'verify-phone' : landingForRole());
    } catch {
      go('error');
    }
  };
  const handleVerify = async () => {
    if (!/^\d{6}$/.test(otp)) return go('error');
    if (supabase) {
      try {
        const result = await supabase.auth.verifyOtp({
          token: otp,
          type: authIdentifier.includes('@') ? 'email' : 'sms',
          ...(authIdentifier.includes('@') ? { email: authIdentifier } : { phone: authIdentifier }),
        });
        if (result.error) return go('error');
      } catch {
        go('error');
        return;
      }
    }
    go('location-permission');
  };
  const handleResetRequest = async () => {
    const value = identifier.trim();
    if (!value) return go('error');
    setAuthIdentifier(value);
    if (supabase) {
      if (!value.includes('@')) return go('error');
      const result = await supabase.auth.resetPasswordForEmail(value, { redirectTo: 'civiclens://reset-password' });
      if (result.error) return go('error');
    }
    go('reset-password');
  };
  const handlePasswordUpdate = async () => {
    if (!resetPasswordSchema.safeParse({ newPassword, confirmPassword }).success) return go('error');
    if (supabase) {
      const result = await supabase.auth.updateUser({ password: newPassword });
      if (result.error) return go('error');
    }
    go('password-updated');
  };
  const activateHotspot = async (to: string, label: string) => {
    if (current.id === 'location-permission' && label.startsWith('Allow location')) {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch { /* A demo route remains usable when location is unavailable. */ }
    }
    if (current.id === 'drop-pin' && label === 'Confirm location') {
      try {
        const permission = await Location.getForegroundPermissionsAsync();
        if (permission.granted) {
          const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        }
      } catch { /* Keep the manually placed demo pin available. */ }
    }
    if (current.id === 'take-photo' || current.id === 'repair-camera') {
      try {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) return;
        const capture = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: false });
        if (capture.canceled || !capture.assets[0]) return;
        setDraftPhotoUri(capture.assets[0].uri);
      } catch {
        return;
      }
    }
    go(to);
  };

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_event, gesture) => Math.abs(gesture.dx) > 32 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderRelease: (_event, gesture) => {
      if (gesture.dx < -48) goNext();
      if (gesture.dx > 48) goBack();
    },
  }), [current.id, index, role, router]);

  return (
    <View style={styles.canvas}>
      <View style={[styles.reference, { width: contentWidth, height: contentHeight }]} {...panResponder.panHandlers}>
        <Image
          source={current.source}
          resizeMode="stretch"
          accessible
          accessibilityLabel={`${current.title}, supplied CivicLens design reference`}
          style={StyleSheet.absoluteFill}
        />

        {/* Unmapped artwork taps advance through the supplied screen catalog. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Show next prototype screen" onPress={goNext} style={StyleSheet.absoluteFill} />

        {/* Transparent hit areas keep the supplied visual unchanged while making the pictured flow navigable. */}
        <Pressable accessibilityRole="button" accessibilityLabel="Continue" onPress={current.id === 'sign-in' ? handleSignIn : current.id === 'verify-phone' ? handleVerify : current.id === 'forgot-password' ? handleResetRequest : current.id === 'reset-password' ? handlePasswordUpdate : goNext} style={styles.primaryAction} />
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backAction} />

        {current.id === 'sign-in' && <>
          {(['citizen', 'engineer', 'officer'] as CivicRole[]).map((entry, roleIndex) => (
            <Pressable
              key={entry}
              accessibilityRole="button"
              accessibilityLabel={`Sign in as ${entry}`}
              onPress={() => setRole(entry)}
              style={{ position: 'absolute', left: `${7 + roleIndex * 28}%`, top: '21%', width: '26%', height: '7%' }}
            />
          ))}
          <TextInput accessibilityLabel="Phone or email" autoCapitalize="none" keyboardType="email-address" value={identifier} onChangeText={(value) => { authForm.setValue('identifier', value, { shouldValidate: true }); setAuthIdentifier(value); }} placeholder="" style={[styles.input, { top: '34%', height: '7%' }]} />
          <TextInput accessibilityLabel="Password" secureTextEntry value={password} onChangeText={(value) => authForm.setValue('password', value, { shouldValidate: true })} placeholder="" style={[styles.input, { top: '49%', height: '7%' }]} />
        </>}
        {current.id === 'verify-phone' && <TextInput accessibilityLabel="Six digit verification code" keyboardType="number-pad" maxLength={6} value={otp} onChangeText={setOtp} placeholder="" style={[styles.input, { top: '48%', height: '8%', textAlign: 'center', letterSpacing: 8 }]} />}
        {current.id === 'forgot-password' && <TextInput accessibilityLabel="Phone or email" autoCapitalize="none" value={identifier} onChangeText={(value) => { authForm.setValue('identifier', value); setAuthIdentifier(value); }} placeholder="" style={[styles.input, { top: '24%', height: '8%' }]} />}
        {current.id === 'reset-password' && <>
          <TextInput accessibilityLabel="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} placeholder="" style={[styles.input, { top: '17%', height: '7%' }]} />
          <TextInput accessibilityLabel="Confirm password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} placeholder="" style={[styles.input, { top: '33%', height: '7%' }]} />
        </>}
        {current.id === 'report-details' && <>
          <TextInput accessibilityLabel="Report title" placeholder="" style={[styles.input, { top: '16%', height: '7%' }]} />
          <TextInput accessibilityLabel="Report description" placeholder="" multiline textAlignVertical="top" style={[styles.input, styles.multiline, { top: '25%', height: '19%' }]} />
        </>}
        {current.id === 'create-post' && <>
          <TextInput accessibilityLabel="Post title" placeholder="" style={[styles.input, { top: '24%', height: '7%' }]} />
          <TextInput accessibilityLabel="Post details" multiline textAlignVertical="top" placeholder="" style={[styles.input, styles.multiline, { top: '38%', height: '20%' }]} />
        </>}
        {current.id === 'contact-support' && <TextInput accessibilityLabel="Support message" multiline textAlignVertical="top" placeholder="" style={[styles.input, styles.multiline, { top: '37%', height: '16%' }]} />}

        {(hotspots[current.id] ?? []).map((hotspot, hotspotIndex) => (
          <Pressable
            key={`${current.id}-${hotspotIndex}`}
            accessibilityRole="button"
            accessibilityLabel={hotspot.label}
            onPress={() => {
              if (current.id === 'sign-in' && hotspot.label === 'Fill demo details') return go(landingForRole());
              if (current.id === 'choose-role' && hotspotIndex < 3) setRole(hotspotIndex === 1 ? 'engineer' : hotspotIndex === 2 ? 'officer' : 'citizen');
              void activateHotspot(hotspot.to, hotspot.label);
            }}
            style={{ position: 'absolute', left: `${hotspot.left}%`, top: `${hotspot.top}%`, width: `${hotspot.width}%`, height: `${hotspot.height}%` }}
          />
        ))}

        {hasTabs && (
          <View style={styles.tabs}>
            {destinations.map((destination, tabIndex) => (
              <Pressable
                key={destination}
                accessibilityRole="tab"
                accessibilityLabel={Object.keys(tabDestinations)[tabIndex]}
                onPress={() => go(destination)}
                style={styles.tab}
              />
            ))}
            <Pressable accessibilityRole="button" accessibilityLabel="Create a report" onPress={() => go('report-category')} style={styles.addTab} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: { flex: 1, backgroundColor: colors.ground, alignItems: 'center', justifyContent: 'center' },
  reference: { overflow: 'hidden', position: 'relative' },
  primaryAction: { position: 'absolute', left: '7%', right: '7%', bottom: '3%', height: '10%' },
  backAction: { position: 'absolute', left: 0, top: 0, width: '17%', height: '9%' },
  tabs: { position: 'absolute', left: '7%', right: '20%', bottom: '2%', height: '8%', flexDirection: 'row' },
  tab: { flex: 1 },
  addTab: { position: 'absolute', right: '-27%', top: 0, height: '100%', width: '26%' },
  input: { position: 'absolute', left: '11%', width: '78%', color: '#59645D', fontSize: 14, padding: 0, backgroundColor: 'transparent' },
  multiline: { paddingTop: 3 },
});
