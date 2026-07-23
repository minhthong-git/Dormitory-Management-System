import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
  FlatList,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function AdminDashboard({ navigation }) {
  const { state, logout, currentUser, dispatch } = useCinema();
  const [currentTab, setCurrentTab] = useState('Dashboard'); // 'Dashboard', 'Movies', 'Schedules', 'Profile'
  const [movieSearch, setMovieSearch] = useState('');

  // Statistics calculation
  const totalMovies = state.movies.length;
  const totalSchedules = state.schedules.length;
  const activeBookingsCount = state.bookings.filter(b => b.status === 'active').length;
  const totalBookingsCount = state.bookings.length;
  const totalAvailableSeats = state.schedules.reduce((acc, s) => acc + s.availableSeats, 0);

  const handleLogout = () => {
    logout();
  };

  // Sort movies alphabetically by title
  const sortedMovies = [...state.movies].sort((a, b) =>
    a.title.localeCompare(b.title)
  );

  // Filter movies based on search input
  const filteredMovies = sortedMovies.filter(m =>
    m.title.toLowerCase().includes(movieSearch.toLowerCase()) ||
    m.genre.toLowerCase().includes(movieSearch.toLowerCase())
  );

  // Sort schedules by date, then by start time
  const sortedSchedules = [...state.schedules].sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.startTime.localeCompare(b.startTime);
  });

  const handleRemoveMovie = (movieId, movieTitle) => {
    const movieSchedules = state.schedules.filter(s => s.movieId === movieId);
    const hasBookings = state.bookings.some(
      b => movieSchedules.some(s => s.id === b.scheduleId) && b.status === 'active'
    );

    if (hasBookings) {
      Alert.alert(
        'Cannot Remove Movie',
        `The movie "${movieTitle}" has active customer bookings and cannot be removed.`
      );
      return;
    }

    Alert.alert(
      'Remove Movie',
      `Are you sure you want to remove "${movieTitle}" and all its screening schedules?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch({
              type: 'REMOVE_MOVIE',
              payload: movieId,
            });
            Alert.alert('Success', `"${movieTitle}" has been removed.`);
          },
        },
      ]
    );
  };

  const handleRemoveSchedule = (scheduleId, date, startTime, room) => {
    const hasBookings = state.bookings.some(b => b.scheduleId === scheduleId && b.status === 'active');
    if (hasBookings) {
      Alert.alert(
        'Cannot Remove Schedule',
        'This screening schedule has active customer bookings and cannot be removed.'
      );
      return;
    }

    Alert.alert(
      'Remove Screening Schedule',
      `Are you sure you want to remove this screening in ${room} on ${date} at ${startTime}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            dispatch({
              type: 'REMOVE_SCHEDULE',
              payload: scheduleId,
            });
            Alert.alert('Success', 'Screening schedule has been removed.');
          },
        },
      ]
    );
  };

  // --- Sub-View Renderers ---

  const renderDashboardView = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* Stats Cards Grid */}
        <View style={styles.statsGrid}>
          {/* Total Movies */}
          <View style={[styles.statCard, { backgroundColor: COLORS.cardPurpleBg }]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconCirclePurple}>
                <Ionicons name="film" size={20} color={COLORS.cardPurpleText} />
              </View>
            </View>
            <Text style={[styles.statNumber, { color: COLORS.cardPurpleText }]}>{totalMovies}</Text>
            <Text style={styles.statLabel}>Total Movies</Text>
          </View>

          {/* Total Schedules */}
          <View style={[styles.statCard, { backgroundColor: COLORS.cardBlueBg }]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconCircleBlue}>
                <Ionicons name="calendar" size={20} color={COLORS.cardBlueText} />
              </View>
            </View>
            <Text style={[styles.statNumber, { color: COLORS.cardBlueText }]}>{totalSchedules}</Text>
            <Text style={styles.statLabel}>Total Schedules</Text>
          </View>

          {/* Active Bookings */}
          <View style={[styles.statCard, { backgroundColor: COLORS.cardGreenBg }]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconCircleGreen}>
                <Ionicons name="ticket" size={20} color={COLORS.cardGreenText} />
              </View>
            </View>
            <Text style={[styles.statNumber, { color: COLORS.cardGreenText }]}>{activeBookingsCount}</Text>
            <Text style={styles.statLabel}>Active Bookings</Text>
            <Text style={styles.statSubLabel}>({totalBookingsCount} overall)</Text>
          </View>

          {/* Available Seats */}
          <View style={[styles.statCard, { backgroundColor: COLORS.cardOrangeBg }]}>
            <View style={styles.statCardHeader}>
              <View style={styles.iconCircleOrange}>
                <Ionicons name="ellipse" size={20} color={COLORS.cardOrangeText} />
              </View>
            </View>
            <Text style={[styles.statNumber, { color: COLORS.cardOrangeText }]}>{totalAvailableSeats}</Text>
            <Text style={styles.statLabel}>Available Seats</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('MovieInput')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: '#F3E8FF' }]}>
              <Ionicons name="add-circle" size={24} color="#7C3AED" />
            </View>
            <Text style={styles.quickActionTitle}>Add Movie</Text>
            <Text style={styles.quickActionSub}>Create movie entry</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => navigation.navigate('ScheduleInput')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="time" size={24} color="#2563EB" />
            </View>
            <Text style={styles.quickActionTitle}>Add Schedule</Text>
            <Text style={styles.quickActionSub}>Create screening</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionCard} onPress={() => setCurrentTab('Profile')}>
            <View style={[styles.quickActionIconBg, { backgroundColor: '#E0F2FE' }]}>
              <Ionicons name="person" size={24} color="#0284C7" />
            </View>
            <Text style={styles.quickActionTitle}>System Profile</Text>
            <Text style={styles.quickActionSub}>Admin details</Text>
          </TouchableOpacity>
        </View>

        {/* Featured Movies preview */}
        <View style={styles.movieHeaderRow}>
          <Text style={styles.sectionTitle}>Featured Movies</Text>
          <TouchableOpacity onPress={() => setCurrentTab('Movies')}>
            <Text style={styles.viewAllText}>Manage All ></Text>
          </TouchableOpacity>
        </View>

        <View style={styles.movieListContainer}>
          {sortedMovies.slice(0, 3).map((item) => {
            const mSchedules = state.schedules.filter(s => s.movieId === item.id);
            return (
              <View key={item.id} style={styles.movieRowCard}>
                <View style={styles.movieInfoLeft}>
                  <View style={styles.movieImagePlaceholder}>
                    <Ionicons name="film-outline" size={22} color={COLORS.textDim} />
                  </View>
                  <View style={styles.movieTextContainer}>
                    <Text style={styles.movieTitleText} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.movieMetaText}>{item.genre} • {item.duration}m</Text>
                    <Text style={styles.movieSchedulesCount}>📅 {mSchedules.length} Screening Schedules</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.rowActionBtn}
                  onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
                >
                  <Ionicons name="eye-outline" size={16} color={COLORS.primary} />
                  <Text style={[styles.rowActionBtnText, { color: COLORS.primary }]}>View</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderMoviesView = () => {
    return (
      <View style={styles.tabContent}>
        <View style={styles.searchWrapper}>
          <Ionicons name="search-outline" size={20} color={COLORS.textDim} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search movie title or genre..."
            placeholderTextColor={COLORS.textDim}
            value={movieSearch}
            onChangeText={setMovieSearch}
          />
        </View>

        <FlatList
          data={filteredMovies}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const mSchedules = state.schedules.filter(s => s.movieId === item.id);
            return (
              <View style={styles.movieRowCard}>
                <View style={styles.movieInfoLeft}>
                  <View style={styles.movieImagePlaceholder}>
                    <Ionicons name="film" size={22} color={COLORS.textDim} />
                  </View>
                  <View style={styles.movieTextContainer}>
                    <Text style={styles.movieTitleText}>{item.title}</Text>
                    <Text style={styles.movieMetaText}>{item.genre} • {item.duration}m • {item.ageRating}</Text>
                    <Text style={styles.movieSchedulesCount}>🕒 {mSchedules.length} schedules configured</Text>
                  </View>
                </View>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={styles.rowActionBtn}
                    onPress={() => navigation.navigate('MovieDetail', { movieId: item.id })}
                  >
                    <Ionicons name="eye-outline" size={14} color={COLORS.primary} />
                    <Text style={[styles.rowActionBtnText, { color: COLORS.primary }]}>View</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.rowActionBtn, styles.removeBtn]}
                    onPress={() => handleRemoveMovie(item.id, item.title)}
                  >
                    <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                    <Text style={[styles.rowActionBtnText, { color: COLORS.danger }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="film-outline" size={48} color={COLORS.textDim} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No movies match the registry.</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderSchedulesView = () => {
    return (
      <View style={styles.tabContent}>
        <FlatList
          data={sortedSchedules}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const movie = state.movies.find(m => m.id === item.movieId);
            const isSoldOut = item.availableSeats <= 0;
            return (
              <View style={styles.scheduleRowCard}>
                <View style={styles.scheduleRowLeft}>
                  <View style={styles.scheduleTimeBlock}>
                    <Text style={styles.scheduleTimeText}>{item.startTime}</Text>
                    <Text style={styles.scheduleRoomText}>{item.room}</Text>
                  </View>
                  <View style={styles.scheduleDetailBlock}>
                    <Text style={styles.scheduleMovieTitle} numberOfLines={1}>
                      {movie ? movie.title : 'Unknown Movie'}
                    </Text>
                    <Text style={styles.scheduleDateText}>📅 {item.date}</Text>
                    <Text style={[
                      styles.scheduleSeatsText,
                      isSoldOut ? { color: COLORS.danger } : { color: COLORS.success }
                    ]}>
                      {isSoldOut ? '🔴 SOLD OUT' : `🟢 Capacity: ${item.availableSeats}/${item.totalSeats} seats`}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.scheduleDeleteBtn}
                  onPress={() => handleRemoveSchedule(item.id, item.date, item.startTime, item.room)}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="calendar-outline" size={48} color={COLORS.textDim} style={styles.emptyIcon} />
              <Text style={styles.emptyText}>No schedules created. Click 'Add Schedule' to create one.</Text>
            </View>
          }
        />
      </View>
    );
  };

  const renderProfileView = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} style={styles.tabContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <View style={styles.profileAvatarContainer}>
            <LinearGradient colors={['#7C3AED', '#3B82F6']} style={styles.profileAvatarGradient}>
              <Text style={styles.profileAvatarText}>
                {currentUser?.fullName ? currentUser.fullName.charAt(0) : 'A'}
              </Text>
            </LinearGradient>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.success} />
            </View>
          </View>
          <Text style={styles.profileFullName}>{currentUser?.fullName || 'Cinema Administrator'}</Text>
          <Text style={styles.profileUsername}>@{currentUser?.username || 'admin'}</Text>
          <View style={styles.profileRoleContainer}>
            <Text style={styles.profileRoleText}>SYSTEM {currentUser?.role?.toUpperCase() || 'ADMIN'}</Text>
          </View>
        </View>

        {/* Profile Info Fields */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.profileInfoBox}>
          <View style={styles.profileInfoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoRowLabel}>Email Address</Text>
            </View>
            <Text style={styles.infoRowValue}>admin@cinematix.com</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileInfoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="phone-portrait-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoRowLabel}>Mobile Phone</Text>
            </View>
            <Text style={styles.infoRowValue}>+1 (555) 019-2834</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.profileInfoRow}>
            <View style={styles.infoRowLeft}>
              <Ionicons name="location-outline" size={18} color={COLORS.textMuted} />
              <Text style={styles.infoRowLabel}>Work Station</Text>
            </View>
            <Text style={styles.infoRowValue}>Main Booking Desk</Text>
          </View>
        </View>

        {/* Booking Statistics summary */}
        <Text style={styles.sectionTitle}>System Statistics</Text>
        <View style={styles.profileStatsBox}>
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileStatsVal}>{totalMovies}</Text>
            <Text style={styles.profileStatsLbl}>Movies</Text>
          </View>
          <View style={styles.statsSeparator} />
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileStatsVal}>{totalSchedules}</Text>
            <Text style={styles.profileStatsLbl}>Screenings</Text>
          </View>
          <View style={styles.statsSeparator} />
          <View style={styles.profileStatsItem}>
            <Text style={styles.profileStatsVal}>{totalBookingsCount}</Text>
            <Text style={styles.profileStatsLbl}>Bookings</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.profileActionsContainer}>
          <TouchableOpacity style={styles.profileEditBtn} onPress={() => Alert.alert('Edit Profile', 'Profile editing UI is currently read-only.')}>
            <Ionicons name="create-outline" size={20} color={COLORS.secondary} />
            <Text style={styles.profileEditBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileLogoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
            <Text style={styles.profileLogoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Dynamic Header based on active tab */}
      <LinearGradient colors={['#6366F1', '#3B82F6']} style={styles.headerGradient}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name="menu-outline" size={24} color={COLORS.white} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {currentTab === 'Dashboard' ? 'Admin Dashboard' :
             currentTab === 'Movies' ? 'Movie Registry' :
             currentTab === 'Schedules' ? 'Screening Schedules' : 'Administrator Profile'}
          </Text>
          <View style={styles.roleBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.cardPurpleText} />
            <Text style={styles.roleBadgeText}>Admin</Text>
          </View>
        </View>

        <View style={styles.welcomeContainer}>
          {currentTab === 'Dashboard' ? (
            <>
              <Text style={styles.welcomeText}>Welcome, Admin 👋</Text>
              <Text style={styles.welcomeSub}>Manage movies, schedules, and bookings</Text>
            </>
          ) : (
            <Text style={styles.welcomeTextSubTitle}>
              {currentTab === 'Movies' ? 'Alphabetical Movie Listings' :
               currentTab === 'Schedules' ? 'Rooms capacity & timings' : 'Profile information details'}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* Main content body inside light curves container */}
      <View style={styles.contentBody}>
        {currentTab === 'Dashboard' && renderDashboardView()}
        {currentTab === 'Movies' && renderMoviesView()}
        {currentTab === 'Schedules' && renderSchedulesView()}
        {currentTab === 'Profile' && renderProfileView()}
      </View>

      {/* Custom Bottom Tab Bar matching reference design */}
      <View style={styles.tabBar}>
        {/* Tab 1: Dashboard */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Dashboard')}
        >
          <Ionicons
            name={currentTab === 'Dashboard' ? 'grid' : 'grid-outline'}
            size={22}
            color={currentTab === 'Dashboard' ? COLORS.secondary : COLORS.textDim}
          />
          <Text style={[styles.tabText, currentTab === 'Dashboard' && styles.tabTextActive]}>
            Dashboard
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Movies */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Movies')}
        >
          <Ionicons
            name={currentTab === 'Movies' ? 'film' : 'film-outline'}
            size={22}
            color={currentTab === 'Movies' ? COLORS.secondary : COLORS.textDim}
          />
          <Text style={[styles.tabText, currentTab === 'Movies' && styles.tabTextActive]}>
            Movies
          </Text>
        </TouchableOpacity>

        {/* Tab 3: Schedules */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Schedules')}
        >
          <Ionicons
            name={currentTab === 'Schedules' ? 'calendar' : 'calendar-outline'}
            size={22}
            color={currentTab === 'Schedules' ? COLORS.secondary : COLORS.textDim}
          />
          <Text style={[styles.tabText, currentTab === 'Schedules' && styles.tabTextActive]}>
            Schedules
          </Text>
        </TouchableOpacity>

        {/* Tab 4: Profile */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => setCurrentTab('Profile')}
        >
          <Ionicons
            name={currentTab === 'Profile' ? 'person' : 'person-outline'}
            size={22}
            color={currentTab === 'Profile' ? COLORS.secondary : COLORS.textDim}
          />
          <Text style={[styles.tabText, currentTab === 'Profile' && styles.tabTextActive]}>
            Profile
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerGradient: {
    paddingTop: 50,
    paddingHorizontal: SPACING.lg,
    paddingBottom: 50,
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
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDER_RADIUS.small,
    gap: 4,
  },
  roleBadgeText: {
    color: COLORS.cardPurpleText,
    fontSize: 12,
    fontWeight: 'bold',
  },
  welcomeContainer: {
    marginTop: SPACING.xs,
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
  welcomeTextSubTitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
    fontWeight: '500',
  },
  contentBody: {
    flex: 1,
    marginTop: -30,
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.large,
    borderTopRightRadius: BORDER_RADIUS.large,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: 60, // TabBar offset
  },
  tabContent: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: SPACING.md,
    marginTop: SPACING.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  statCard: {
    width: '47%',
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    minHeight: 110,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.02)',
    ...SHADOWS.small,
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconCirclePurple: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124, 58, 237, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleBlue: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleGreen: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleOrange: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(217, 119, 6, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statNumber: {
    fontSize: 26,
    fontWeight: '900',
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  statSubLabel: {
    color: COLORS.textDim,
    fontSize: 10,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  quickActionCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  quickActionIconBg: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  quickActionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  quickActionSub: {
    fontSize: 10,
    color: COLORS.textDim,
    marginTop: 2,
    textAlign: 'center',
  },
  movieHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  viewAllText: {
    color: COLORS.primary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  movieListContainer: {
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  movieRowCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  movieInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  movieImagePlaceholder: {
    width: 46,
    height: 46,
    backgroundColor: COLORS.surfaceDark,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  movieTextContainer: {
    flex: 1,
  },
  movieTitleText: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: 'bold',
  },
  movieMetaText: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 1,
  },
  movieSchedulesCount: {
    color: COLORS.primary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
  rowActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.small,
    backgroundColor: 'rgba(37, 99, 235, 0.06)',
    gap: 3,
  },
  removeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
  },
  rowActionBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyIcon: {
    marginBottom: SPACING.md,
    opacity: 0.7,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: SPACING.xl,
  },
  searchWrapper: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.medium,
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  searchIcon: {
    marginRight: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
  },
  scheduleRowCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.large,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  scheduleRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: SPACING.sm,
  },
  scheduleTimeBlock: {
    backgroundColor: 'rgba(99, 102, 241, 0.08)',
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.md,
    minWidth: 80,
  },
  scheduleTimeText: {
    color: COLORS.cardPurpleText,
    fontSize: 16,
    fontWeight: 'bold',
  },
  scheduleRoomText: {
    color: COLORS.textMuted,
    fontSize: 10,
    marginTop: 2,
    fontWeight: 'bold',
  },
  scheduleDetailBlock: {
    flex: 1,
  },
  scheduleMovieTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  scheduleDateText: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  scheduleSeatsText: {
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 2,
  },
  scheduleDeleteBtn: {
    padding: SPACING.sm,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: BORDER_RADIUS.medium,
  },
  profileHeaderCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.xl,
    alignItems: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  profileAvatarContainer: {
    position: 'relative',
    marginBottom: SPACING.md,
  },
  profileAvatarGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.medium,
  },
  profileAvatarText: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: 'bold',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 10,
  },
  profileFullName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileUsername: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  profileRoleContainer: {
    backgroundColor: 'rgba(124, 58, 237, 0.1)',
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginTop: SPACING.sm,
  },
  profileRoleText: {
    color: COLORS.cardPurpleText,
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  profileInfoBox: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  profileInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
  infoRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  infoRowLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  infoRowValue: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  profileStatsBox: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.large,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    ...SHADOWS.small,
    marginBottom: SPACING.md,
  },
  profileStatsItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStatsVal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileStatsLbl: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  statsSeparator: {
    width: 1,
    backgroundColor: COLORS.border,
    height: '60%',
    alignSelf: 'center',
  },
  profileActionsContainer: {
    gap: SPACING.md,
    marginTop: SPACING.sm,
    marginBottom: SPACING.xl,
  },
  profileEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.secondary,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 12,
    gap: SPACING.xs,
  },
  profileEditBtnText: {
    color: COLORS.secondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  profileLogoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: 12,
    gap: SPACING.xs,
  },
  profileLogoutBtnText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: 'bold',
  },
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    color: COLORS.textDim,
    marginTop: 2,
    fontWeight: '600',
  },
  tabTextActive: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
});
