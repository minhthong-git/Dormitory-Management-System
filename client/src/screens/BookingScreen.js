import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCinema } from '../context/CinemaContext';
import { ACTION_TYPES, validateBooking } from '../CinemaReducer';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function BookingScreen({ route, navigation }) {
  const { scheduleId } = route.params;
  const { state, dispatch, currentUser } = useCinema();
  const [errorText, setErrorText] = useState('');

  // Get schedule details
  const schedule = state.schedules.find(s => s.id === scheduleId);
  const movie = schedule ? state.movies.find(m => m.id === schedule.movieId) : null;

  if (!schedule || !movie) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Schedule or movie details missing.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleConfirmBooking = () => {
    setErrorText('');

    // Run business validations
    const validation = validateBooking(state, currentUser.id, scheduleId);
    if (!validation.valid) {
      setErrorText(validation.error);
      return;
    }

    // Validation passes -> dispatch CREATE_BOOKING action
    dispatch({
      type: ACTION_TYPES.CREATE_BOOKING,
      payload: {
        customerId: currentUser.id,
        scheduleId: scheduleId,
      },
    });

    Alert.alert(
      'Booking Confirmed',
      `You have successfully booked a seat for "${movie.title}".`,
      [
        {
          text: 'View My Bookings',
          onPress: () => {
            // Navigate to MyBookings
            navigation.navigate('MyBookings');
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackBtnText}>← Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Booking</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        
        {/* Ticket Summary Card */}
        <View style={styles.ticketCard}>
          <View style={styles.ticketStubLeft}>
            <Text style={styles.ticketHeading}>MOVIE TICKET</Text>
            <Text style={styles.movieTitle}>{movie.title}</Text>
            
            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>DATE</Text>
                <Text style={styles.infoValue}>{schedule.date}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>TIME</Text>
                <Text style={styles.infoValue}>{schedule.startTime}</Text>
              </View>
            </View>

            <View style={styles.infoGrid}>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>HALL / ROOM</Text>
                <Text style={styles.infoValue}>{schedule.room}</Text>
              </View>
              <View style={styles.infoCol}>
                <Text style={styles.infoLabel}>RATING</Text>
                <Text style={styles.infoValue}>{movie.ageRating}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.ticketDivider}>
            <View style={styles.circleTop} />
            <View style={styles.dashedLine} />
            <View style={styles.circleBottom} />
          </View>

          <View style={styles.ticketStubRight}>
            <Text style={styles.qtyLabel}>QTY</Text>
            <Text style={styles.qtyValue}>1</Text>
            <Text style={styles.seatLabel}>SEAT TYPE</Text>
            <Text style={styles.seatValue}>Standard</Text>
          </View>
        </View>

        {/* Capacity Indicator */}
        <View style={styles.capacityCard}>
          <Text style={styles.capacityText}>
            Seats remaining:{' '}
            <Text style={{ fontWeight: 'bold', color: COLORS.primary }}>
              {schedule.availableSeats} / {schedule.totalSeats}
            </Text>
          </Text>
        </View>

        {/* Validation Errors Box */}
        {errorText ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorIcon}>⚠️</Text>
            <Text style={styles.errorMsg}>{errorText}</Text>
          </View>
        ) : null}

        {/* Actions */}
        <View style={styles.actionContainer}>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmBooking}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              style={styles.confirmGradient}
            >
              <Text style={styles.confirmButtonText}>Confirm & Book Ticket</Text>
            </LinearGradient>
          </TouchableOpacity>

          <Text style={styles.disclaimerText}>
            Note: You may only have one active ticket booking at any time. Screenings are non-transferable.
          </Text>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  navBackBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  navBackBtnText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: SPACING.lg,
    justifyContent: 'center',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.lg,
  },
  backButton: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  ticketCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    flexDirection: 'row',
    minHeight: 180,
    marginBottom: SPACING.lg,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  ticketStubLeft: {
    flex: 2.5,
    padding: SPACING.md,
    justifyContent: 'space-between',
  },
  ticketHeading: {
    color: COLORS.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
  },
  movieTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: SPACING.xs,
  },
  infoGrid: {
    flexDirection: 'row',
    marginTop: SPACING.xs,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textDim,
    fontSize: 9,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  infoValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: 'bold',
  },
  ticketDivider: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  circleTop: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    position: 'absolute',
    top: -11,
  },
  dashedLine: {
    flex: 1,
    width: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  circleBottom: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
    borderWidth: 1,
    position: 'absolute',
    bottom: -11,
  },
  ticketStubRight: {
    flex: 1,
    backgroundColor: COLORS.surfaceDark,
    padding: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderColor: COLORS.border,
  },
  qtyLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: 'bold',
  },
  qtyValue: {
    color: COLORS.primary,
    fontSize: 32,
    fontWeight: '900',
    marginVertical: SPACING.xs,
  },
  seatLabel: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seatValue: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  capacityCard: {
    alignItems: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: SPACING.sm,
    borderColor: COLORS.border,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  capacityText: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  errorBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderColor: COLORS.danger,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.medium,
    padding: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    fontSize: 16,
    marginRight: SPACING.sm,
  },
  errorMsg: {
    flex: 1,
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '600',
  },
  actionContainer: {
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  confirmButton: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  confirmGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  disclaimerText: {
    color: COLORS.textDim,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.md,
  },
});
