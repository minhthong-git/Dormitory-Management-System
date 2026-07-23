import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCinema } from '../context/CinemaContext';
import { ACTION_TYPES } from '../CinemaReducer';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function MyBookings({ navigation }) {
  const { state, dispatch, currentUser } = useCinema();

  // Filter bookings for current customer
  const customerBookings = state.bookings
    .filter(b => b.customerId === currentUser?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); // Newest first

  const handleCancelBooking = (bookingId, movieTitle) => {
    Alert.alert(
      'Cancel Booking',
      `Are you sure you want to cancel your booking for "${movieTitle}"? This will free up your seat.`,
      [
        { text: 'Keep Ticket', style: 'cancel' },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => {
            dispatch({
              type: ACTION_TYPES.CANCEL_BOOKING,
              payload: { bookingId },
            });
            Alert.alert('Success', 'Booking has been cancelled.');
          },
        },
      ]
    );
  };

  const renderBookingItem = ({ item }) => {
    // Get schedule & movie details
    const schedule = state.schedules.find(s => s.id === item.scheduleId);
    const movie = schedule ? state.movies.find(m => m.id === schedule.movieId) : null;

    if (!schedule || !movie) return null;

    const isActive = item.status === 'active';
    const formattedCreatedDate = new Date(item.createdAt).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <View style={styles.bookingCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          <View style={[
            styles.statusBadge,
            isActive ? styles.activeBadge : styles.cancelledBadge
          ]}>
            <Text style={[
              styles.statusText,
              isActive ? styles.activeStatusText : styles.cancelledStatusText
            ]}>
              {item.status.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Screen Date:</Text>
            <Text style={styles.detailValue}>{schedule.date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Start Time:</Text>
            <Text style={styles.detailValue}>{schedule.startTime}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Cinema Room:</Text>
            <Text style={styles.detailValue}>{schedule.room}</Text>
          </View>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Booked On:</Text>
            <Text style={styles.detailValue}>{formattedCreatedDate}</Text>
          </View>
        </View>

        {isActive ? (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => handleCancelBooking(item.id, movie.title)}
          >
            <LinearGradient
              colors={['#EF4444', '#B91C1C']}
              style={styles.cancelGradient}
            >
              <Text style={styles.cancelButtonText}>Cancel Booking</Text>
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <View style={styles.cancelledPlaceholder}>
            <Text style={styles.cancelledPlaceholderText}>Seat Restored to System</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={{ width: 60 }} />
      </View>

      <FlatList
        data={customerBookings}
        keyExtractor={(item) => item.id}
        renderItem={renderBookingItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎟️</Text>
            <Text style={styles.emptyText}>You have no booking history.</Text>
            <TouchableOpacity 
              style={styles.browseButton}
              onPress={() => navigation.navigate('CustomerHome')}
            >
              <Text style={styles.browseButtonText}>Browse Movies</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.lg,
    ...SHADOWS.small,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    paddingBottom: SPACING.sm,
  },
  movieTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: SPACING.md,
  },
  statusBadge: {
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  activeBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: COLORS.success,
    borderWidth: 1,
  },
  cancelledBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: COLORS.danger,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '900',
  },
  activeStatusText: {
    color: COLORS.success,
  },
  cancelledStatusText: {
    color: COLORS.danger,
  },
  detailsGrid: {
    gap: 6,
    marginBottom: SPACING.md,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    color: COLORS.textDim,
    fontSize: 13,
  },
  detailValue: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  cancelButton: {
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    marginTop: SPACING.xs,
    ...SHADOWS.small,
  },
  cancelGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  cancelledPlaceholder: {
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surfaceDark,
    borderRadius: BORDER_RADIUS.medium,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelledPlaceholderText: {
    color: COLORS.textDim,
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
    opacity: 0.5,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
    marginBottom: SPACING.lg,
  },
  browseButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.medium,
    ...SHADOWS.small,
  },
  browseButtonText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
