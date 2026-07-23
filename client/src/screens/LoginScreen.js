import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function LoginScreen() {
  const { login, state, clearError } = useCinema();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [roleSelection, setRoleSelection] = useState('admin'); // admin or customer
  const [secureText, setSecureText] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Username and password are required.');
      return;
    }
    setErrorMessage('');
    
    // Attempt authentication through context
    const result = login(username.trim(), password);
    if (!result.success) {
      setErrorMessage(result.error);
    } else {
      // Validate role alignment (Admin must login as admin, Customer as customer)
      if (result.user.role !== roleSelection) {
        setErrorMessage(`Account role mismatch. You chose '${roleSelection}' but this account is a '${result.user.role}'.`);
      }
    }
  };

  const handleQuickLogin = (user) => {
    setUsername(user.username);
    setPassword(user.password);
    setRoleSelection(user.role);
    setErrorMessage('');
    
    const result = login(user.username, user.password);
    if (!result.success) {
      setErrorMessage(result.error);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        {/* Curved Header Background with Logo */}
        <LinearGradient
          colors={['#4F46E5', '#2563EB']}
          style={styles.headerGradient}
        >
          <View style={styles.logoContainer}>
            <View style={styles.ticketIconBg}>
              <Ionicons name="ticket" size={42} color="#2563EB" style={styles.ticketIcon} />
            </View>
            <Text style={styles.appName}>Cinema Booking</Text>
            <Text style={styles.appSubtitle}>Book Movies. Enjoy the Experience.</Text>
          </View>
        </LinearGradient>

        {/* Card containing inputs */}
        <View style={styles.cardContainer}>
          <View style={styles.welcomeHeader}>
            <Ionicons name="person-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.welcomeTitle}>Welcome Back!</Text>
            <Text style={styles.welcomeSubtitle}>Login to continue to your account</Text>
          </View>

          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={COLORS.danger} style={styles.errorIcon} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Username input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textDim} style={styles.inputIconLeft} />
              <TextInput
                style={styles.input}
                placeholder="Enter username"
                placeholderTextColor={COLORS.textDim}
                value={username}
                onChangeText={(text) => {
                  setUsername(text);
                  if (errorMessage) setErrorMessage('');
                }}
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Password input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color={COLORS.textDim} style={styles.inputIconLeft} />
              <TextInput
                style={[styles.input, { paddingRight: 50 }]}
                placeholder="Enter password"
                placeholderTextColor={COLORS.textDim}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errorMessage) setErrorMessage('');
                }}
                secureTextEntry={secureText}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setSecureText(!secureText)}
              >
                <Ionicons
                  name={secureText ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textDim}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Role selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Login as</Text>
            <View style={styles.roleSelectionRow}>
              {/* Admin option */}
              <TouchableOpacity
                style={[
                  styles.roleSelectorCard,
                  roleSelection === 'admin' && styles.roleSelectorCardActive,
                ]}
                onPress={() => setRoleSelection('admin')}
              >
                <View style={styles.roleSelectorLeft}>
                  <Ionicons
                    name="shield-outline"
                    size={18}
                    color={roleSelection === 'admin' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleSelectorLabel,
                      roleSelection === 'admin' && styles.roleSelectorLabelActive,
                    ]}
                  >
                    Admin
                  </Text>
                </View>
                <View style={styles.radioButton}>
                  {roleSelection === 'admin' && <View style={styles.radioButtonDot} />}
                </View>
              </TouchableOpacity>

              {/* Customer option */}
              <TouchableOpacity
                style={[
                  styles.roleSelectorCard,
                  roleSelection === 'customer' && styles.roleSelectorCardActive,
                ]}
                onPress={() => setRoleSelection('customer')}
              >
                <View style={styles.roleSelectorLeft}>
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={roleSelection === 'customer' ? COLORS.primary : COLORS.textMuted}
                  />
                  <Text
                    style={[
                      styles.roleSelectorLabel,
                      roleSelection === 'customer' && styles.roleSelectorLabelActive,
                    ]}
                  >
                    Customer
                  </Text>
                </View>
                <View style={styles.radioButton}>
                  {roleSelection === 'customer' && <View style={styles.radioButtonDot} />}
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* Login Action Button */}
          <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} activeOpacity={0.9}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.loginGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Ionicons name="log-in-outline" size={20} color="#FFF" style={styles.loginBtnIcon} />
              <Text style={styles.loginBtnText}>LOGIN</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Login Section */}
          <View style={styles.quickLoginDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>Sample Accounts</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.sampleGrid}>
            {state.users.map((user) => (
              <TouchableOpacity
                key={user.id}
                style={styles.sampleCard}
                onPress={() => handleQuickLogin(user)}
              >
                <View style={styles.sampleHeader}>
                  <Ionicons
                    name={user.role === 'admin' ? 'shield-checkmark' : 'person-circle'}
                    size={16}
                    color={user.role === 'admin' ? COLORS.secondary : COLORS.primary}
                  />
                  <Text style={styles.sampleRoleName}>
                    {user.role === 'admin' ? 'Admin' : 'Customer'}
                  </Text>
                </View>
                <Text style={styles.sampleCredentials}>{user.username} / {user.password}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Secure indicator */}
          <View style={styles.secureFooter}>
            <Ionicons name="lock-closed" size={12} color={COLORS.textDim} />
            <Text style={styles.secureText}>Your data is secure with us.</Text>
          </View>
        </View>

        {/* Brand Footer */}
        <View style={styles.brandFooter}>
          <Ionicons name="film-outline" size={24} color="#64748B" style={styles.popcornIcon} />
          <Text style={styles.brandText}>Movie Theater Booking App</Text>
          <Text style={styles.copyrightText}>© 2026 All Rights Reserved.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.xxl,
  },
  headerGradient: {
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: BORDER_RADIUS.xlarge * 1.5,
    borderBottomRightRadius: BORDER_RADIUS.xlarge * 1.5,
    paddingTop: 40,
  },
  logoContainer: {
    alignItems: 'center',
  },
  ticketIconBg: {
    width: 72,
    height: 72,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: BORDER_RADIUS.large,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-10deg' }],
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
  },
  ticketIcon: {
    marginLeft: 1,
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  appSubtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 13,
    marginTop: 4,
  },
  cardContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    marginHorizontal: SPACING.lg,
    marginTop: -40,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  welcomeHeader: {
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  welcomeTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: SPACING.xs,
  },
  welcomeSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    marginRight: SPACING.sm,
  },
  errorText: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 6,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIconLeft: {
    position: 'absolute',
    left: SPACING.md,
    zIndex: 1,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    paddingLeft: 44,
    paddingRight: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    color: COLORS.text,
    fontSize: 15,
  },
  eyeIcon: {
    position: 'absolute',
    right: SPACING.md,
    padding: SPACING.xs,
  },
  roleSelectionRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  roleSelectorCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  roleSelectorCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: 'rgba(37, 99, 235, 0.05)',
  },
  roleSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  roleSelectorLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  roleSelectorLabelActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  radioButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: COLORS.textDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioButtonDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  loginBtn: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    marginTop: SPACING.md,
    ...SHADOWS.glow,
  },
  loginGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  loginBtnIcon: {
    marginRight: SPACING.xs,
  },
  loginBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  quickLoginDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textDim,
    marginHorizontal: SPACING.md,
    fontWeight: '600',
  },
  sampleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sampleCard: {
    width: '48%',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    alignItems: 'center',
  },
  sampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  sampleRoleName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  sampleCredentials: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  secureFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: SPACING.lg,
  },
  secureText: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  brandFooter: {
    alignItems: 'center',
    marginTop: SPACING.xl,
    paddingHorizontal: SPACING.xl,
  },
  popcornIcon: {
    marginBottom: 4,
  },
  brandText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  copyrightText: {
    fontSize: 11,
    color: COLORS.textDim,
    marginTop: 2,
  },
});
