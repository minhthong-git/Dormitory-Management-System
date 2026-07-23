import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function MovieDetail({ route, navigation }) {
  const { movieId } = route.params;
  const { state } = useCinema();

  // Get movie details
  const movie = state.movies.find(m => m.id === movieId);
  if (!movie) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Movie not found.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Get schedules for this movie
  const movieSchedules = state.schedules.filter(s => s.movieId === movieId);

  const getAgeRatingColor = (rating) => {
    switch (rating) {
      case 'P': return COLORS.success;
      case 'T13': return '#3B82F6';
      case 'T16': return '#F59E0B';
      case 'T18': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Custom back button in header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.navBackBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.navBackBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Movie Info</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Movie Hero Card */}
        <View style={styles.movieHero}>
          <LinearGradient
            colors={['#2E225A', '#130E28']}
            style={styles.heroGradient}
          >
            <View style={styles.heroHeader}>
              <View style={[styles.ratingTag, { borderColor: getAgeRatingColor(movie.ageRating) }]}>
                <Text style={[styles.ratingText, { color: getAgeRatingColor(movie.ageRating) }]}>
                  {movie.ageRating}
                </Text>
              </View>
              <Text style={styles.genreText}>{movie.genre}</Text>
            </View>

            <Text style={styles.movieTitle}>{movie.title}</Text>
            <Text style={styles.durationText}>🕒 {movie.duration} minutes</Text>
          </LinearGradient>
        </View>

        {/* Synopsis Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Synopsis</Text>
          <Text style={styles.synopsisText}>{movie.description}</Text>
        </View>

        {/* Screening Schedule Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Screening Schedules</Text>
          {movieSchedules.length > 0 ? (
            movieSchedules.map((schedule) => {
              const isSoldOut = schedule.availableSeats <= 0;
              return (
                <View key={schedule.id} style={styles.scheduleCard}>
                  <View style={styles.scheduleInfo}>
                    <Text style={styles.scheduleDate}>📅 {schedule.date}</Text>
                    <Text style={styles.scheduleTime}>🕒 {schedule.startTime}</Text>
                    <Text style={styles.scheduleRoom}>🚪 {schedule.room}</Text>
                    
                    <Text style={[
                      styles.seatsCount,
                      isSoldOut ? { color: COLORS.danger } : { color: COLORS.success }
                    ]}>
                      {isSoldOut ? '🔴 SOLD OUT' : `🟢 ${schedule.availableSeats} / ${schedule.totalSeats} seats available`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.bookButton,
                      isSoldOut && styles.disabledBookButton
                    ]}
                    disabled={isSoldOut}
                    onPress={() => navigation.navigate('BookingScreen', { scheduleId: schedule.id })}
                  >
                    <LinearGradient
                      colors={isSoldOut ? ['#3F3F46', '#27272A'] : ['#F59E0B', '#D97706']}
                      style={styles.bookButtonGradient}
                    >
                      <Text style={[
                        styles.bookButtonText,
                        isSoldOut && { color: COLORS.textDim }
                      ]}>
                        Book
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              );
            })
          ) : (
            <View style={styles.emptySchedulesCard}>
              <Text style={styles.emptySchedulesText}>
                No screening schedules configured for this movie at this time.
              </Text>
            </View>
          )}
        </View>
        
      </ScrollView>
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
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
  movieHero: {
    borderRadius: BORDER_RADIUS.xlarge,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  heroGradient: {
    padding: SPACING.xl,
  },
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  ratingTag: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  genreText: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: 'bold',
  },
  movieTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.sm,
  },
  durationText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    letterSpacing: 0.5,
  },
  synopsisText: {
    color: COLORS.textMuted,
    fontSize: 14,
    lineHeight: 22,
    backgroundColor: COLORS.surface,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scheduleCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  scheduleInfo: {
    flex: 1,
    gap: 2,
  },
  scheduleDate: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: 'bold',
  },
  scheduleTime: {
    color: COLORS.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  scheduleRoom: {
    color: COLORS.textMuted,
    fontSize: 13,
  },
  seatsCount: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  bookButton: {
    width: 80,
    height: 38,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  disabledBookButton: {
    shadowOpacity: 0,
    elevation: 0,
  },
  bookButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bookButtonText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  emptySchedulesCard: {
    backgroundColor: COLORS.surfaceDark,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  emptySchedulesText: {
    color: COLORS.textDim,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
