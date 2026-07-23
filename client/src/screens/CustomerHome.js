import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function CustomerHome({ navigation }) {
  const { state, currentUser, logout } = useCinema();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Now Showing'); // 'Now Showing', 'Popular', 'Coming Soon'

  // Find active booking for the current customer
  const activeBooking = state.bookings.find(
    b => b.customerId === currentUser?.id && b.status === 'active'
  );

  // If there's an active booking, get its schedule and movie details
  let activeBookingDetails = null;
  if (activeBooking) {
    const schedule = state.schedules.find(s => s.id === activeBooking.scheduleId);
    if (schedule) {
      const movie = state.movies.find(m => m.id === schedule.movieId);
      activeBookingDetails = {
        bookingId: activeBooking.id,
        movieTitle: movie?.title || 'Unknown Movie',
        date: schedule.date,
        time: schedule.startTime,
        room: schedule.room,
      };
    }
  }

  const getAgeRatingColor = (rating) => {
    switch (rating) {
      case 'P': return COLORS.success;
      case 'T13': return '#3B82F6';
      case 'T16': return '#F59E0B';
      case 'T18': return COLORS.danger;
      default: return COLORS.textMuted;
    }
  };

  // Filter movies based on search query
  const filteredMovies = state.movies.filter(movie => {
    const titleMatch = movie.title.toLowerCase().includes(searchQuery.toLowerCase());
    const genreMatch = movie.genre.toLowerCase().includes(searchQuery.toLowerCase());
    return titleMatch || genreMatch;
  });

  const renderMovieCard = ({ item }) => {
    // Get schedule capacity info for this movie
    const movieSchedules = state.schedules.filter(s => s.movieId === item.id);
    const totalSeatsLeft = movieSchedules.reduce((acc, s) => acc + s.availableSeats, 0);

    return (
      <View style={styles.movieCard}>
        <View style={styles.movieCardLeft}>
          <View style={styles.movieThumbnailBg}>
            <Ionicons name="film-outline" size={28} color={COLORS.textDim} />
          </View>
          <View style={styles.movieTextContainer}>
            <Text style={styles.movieTitleText} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.movieGenreText}>{item.genre}</Text>
            
            <View style={styles.movieMetaRow}>
              <View style={[styles.ratingTag, { borderColor: getAgeRatingColor(item.ageRating) }]}>
                <Text style={[styles.ratingText, { color: getAgeRatingColor(item.ageRating) }]}>
                  {item.ageRating}
                </Text>
              </View>
              <Text style={styles.movieDurationText}>🕒 {item.duration}m</Text>
            </View>
            
            {/* Seat capacity badge (Emerald green) */}
            <Text style={styles.seatsLeftText}>
              👤 {totalSeatsLeft} Seats Left
            </Text>
          </View>
        </View>

        <View style={styles.movieCardRight}>
          <TouchableOpacity
            style={styles.bookNowBtn}
            onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
          >
            <Text style={styles.bookNowBtnText}>Book Now</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.viewDetailsLink}
            onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
          >
            <Text style={styles.viewDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header section with curve design */}
      <LinearGradient colors={['#6366F1', '#3B82F6']} style={styles.headerGradient}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Customer Home</Text>
          
          {/* Top-Right Profile button navigating to ProfileScreen */}
          <TouchableOpacity 
            style={styles.roleBadge}
            onPress={() => navigation.navigate('ProfileScreen')}
          >
            <Ionicons name="person-circle" size={16} color={COLORS.primary} />
            <Text style={styles.roleBadgeText}>Customer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.welcomeContainer}>
          <Text style={styles.welcomeText}>
            Hello, Customer! 👋
          </Text>
          <Text style={styles.welcomeSub}>Discover movies and book your next show</Text>
        </View>

        {/* Floating search input */}
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={COLORS.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movies, actors, or genres..."
            placeholderTextColor={COLORS.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          <TouchableOpacity style={styles.searchFilterBtn}>
            <Ionicons name="options-outline" size={20} color={COLORS.primary} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Main Content List */}
      <FlatList
        data={filteredMovies}
        keyExtractor={(item) => item.id}
        renderItem={renderMovieCard}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Horizontal Filter Tabs */}
            <View style={styles.tabsContainer}>
              {['Now Showing', 'Popular', 'Coming Soon'].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.tabButton,
                    activeTab === tab && styles.tabButtonActive
                  ]}
                  onPress={() => setActiveTab(tab)}
                >
                  <Text style={[
                    styles.tabButtonText,
                    activeTab === tab && styles.tabButtonTextActive
                  ]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* My Active Booking Section */}
            {activeBookingDetails ? (
              <View style={styles.activeBookingCard}>
                <View style={styles.activeBookingContent}>
                  <View style={styles.ticketBadgeBg}>
                    <Ionicons name="ticket" size={22} color={COLORS.secondary} />
                  </View>
                  <View style={styles.activeBookingTextCol}>
                    <Text style={styles.activeBookingLabel}>My Active Booking</Text>
                    <Text style={styles.activeBookingMovieTitle} numberOfLines={1}>
                      {activeBookingDetails.movieTitle}
                    </Text>
                    <Text style={styles.activeBookingMeta}>
                      📅 {activeBookingDetails.date}  •  🕒 {activeBookingDetails.time}  •  🚪 {activeBookingDetails.room}
                    </Text>
                  </View>
                </View>

                <View style={styles.activeBookingFooter}>
                  <View style={styles.confirmedBadge}>
                    <View style={styles.dotIndicator} />
                    <Text style={styles.confirmedText}>Confirmed</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.viewBookingBtn}
                    onPress={() => navigation.navigate('MyBookings')}
                  >
                    <Text style={styles.viewBookingText}>View Booking</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.noBookingCard}>
                <Ionicons name="ticket-outline" size={24} color={COLORS.textDim} />
                <View style={styles.noBookingTextCol}>
                  <Text style={styles.noBookingText}>You do not have any active bookings.</Text>
                  <Text style={styles.noBookingSubtext}>Select a movie below to secure your ticket.</Text>
                </View>
              </View>
            )}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Available Movies</Text>
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="film" size={48} color={COLORS.textDim} style={styles.emptyIcon} />
            <Text style={styles.emptyText}>No movies match your search.</Text>
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
  headerGradient: {
    paddingTop: 10,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 35,
    borderBottomLeftRadius: BORDER_RADIUS.xlarge,
    borderBottomRightRadius: BORDER_RADIUS.xlarge,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  menuButton: {
    padding: SPACING.xs,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.small,
    gap: 4,
    ...SHADOWS.small,
  },
  roleBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeContainer: {
    marginTop: SPACING.xs,
    marginBottom: SPACING.lg,
  },
  welcomeText: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold',
  },
  welcomeSub: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 13,
    marginTop: 2,
  },
  searchWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  searchFilterBtn: {
    padding: SPACING.xs,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxl,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginVertical: SPACING.md,
    gap: SPACING.sm,
  },
  tabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.round,
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabButtonActive: {
    backgroundColor: COLORS.secondary,
    borderColor: COLORS.secondary,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.textMuted,
  },
  tabButtonTextActive: {
    color: COLORS.white,
  },
  activeBookingCard: {
    backgroundColor: 'rgba(124, 92, 246, 0.04)',
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: 'rgba(124, 58, 237, 0.15)',
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  activeBookingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124, 58, 237, 0.08)',
    paddingBottom: SPACING.md,
  },
  ticketBadgeBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBookingTextCol: {
    flex: 1,
  },
  activeBookingLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.cardPurpleText,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  activeBookingMovieTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 2,
  },
  activeBookingMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  activeBookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  confirmedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.small,
    gap: 4,
  },
  dotIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.success,
  },
  confirmedText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.success,
  },
  viewBookingBtn: {
    paddingVertical: 6,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.small,
    borderWidth: 1,
    borderColor: COLORS.secondary,
  },
  viewBookingText: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  noBookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    gap: SPACING.md,
    marginBottom: SPACING.lg,
    ...SHADOWS.small,
  },
  noBookingTextCol: {
    flex: 1,
  },
  noBookingText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  noBookingSubtext: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  movieCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  movieCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.3,
  },
  movieThumbnailBg: {
    width: 60,
    height: 75,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginRight: SPACING.md,
  },
  movieTextContainer: {
    flex: 1,
  },
  movieTitleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  movieGenreText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  movieMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 6,
  },
  ratingTag: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  ratingText: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  movieDurationText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  seatsLeftText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: COLORS.success,
    marginTop: 4,
  },
  movieCardRight: {
    flex: 0.8,
    alignItems: 'stretch',
    gap: 8,
  },
  bookNowBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.small,
  },
  bookNowBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  viewDetailsLink: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  viewDetailsText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl * 1.5,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
