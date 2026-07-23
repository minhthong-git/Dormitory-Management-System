import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCinema } from '../context/CinemaContext';
import { ACTION_TYPES } from '../CinemaReducer';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

const ROOMS = ['Cinema 01', 'Cinema 02', 'Cinema 03'];

export default function ScheduleInput({ navigation }) {
  const { state, dispatch } = useCinema();

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [room, setRoom] = useState('Cinema 01');
  const [totalSeats, setTotalSeats] = useState('');
  const [errors, setErrors] = useState({});
  const [movieModalVisible, setMovieModalVisible] = useState(false);

  const validate = () => {
    let tempErrors = {};

    if (!selectedMovie) {
      tempErrors.movieId = 'Please select a movie.';
    }

    // Date Validation (Format: YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date.trim()) {
      tempErrors.date = 'Date is required.';
    } else if (!dateRegex.test(date)) {
      tempErrors.date = 'Date must be in YYYY-MM-DD format.';
    } else {
      // Check if valid date
      const parts = date.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      const checkDate = new Date(y, m, d);
      
      if (
        checkDate.getFullYear() !== y ||
        checkDate.getMonth() !== m ||
        checkDate.getDate() !== d
      ) {
        tempErrors.date = 'Please enter a valid calendar date.';
      } else {
        // Date must not be in the past relative to current local time (2026-07-15)
        // Note: Compare using year/month/date to allow scheduling for today
        const today = new Date(2026, 6, 15); // July is index 6
        if (checkDate < today) {
          tempErrors.date = 'Date cannot be in the past (minimum is 2026-07-15).';
        }
      }
    }

    // Time Validation (Format: HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!startTime.trim()) {
      tempErrors.startTime = 'Start time is required.';
    } else if (!timeRegex.test(startTime)) {
      tempErrors.startTime = 'Start time must be in HH:MM format (24-hour clock).';
    }

    // Room Validation
    if (!room) {
      tempErrors.room = 'Room selection is required.';
    }

    // Total Seats Validation
    const parsedSeats = parseInt(totalSeats, 10);
    if (!totalSeats) {
      tempErrors.totalSeats = 'Total seats is required.';
    } else if (isNaN(parsedSeats) || parsedSeats <= 0) {
      tempErrors.totalSeats = 'Total seats must be a positive integer.';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleAddSchedule = () => {
    if (!validate()) {
      return;
    }

    const payload = {
      movieId: selectedMovie.id,
      date: date.trim(),
      startTime: startTime.trim(),
      room,
      totalSeats: parseInt(totalSeats, 10),
    };

    dispatch({
      type: ACTION_TYPES.ADD_SCHEDULE,
      payload,
    });

    Alert.alert('Success', 'Screening schedule created successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  const handleSelectMovie = (movie) => {
    setSelectedMovie(movie);
    setMovieModalVisible(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Create Screening Schedule</Text>

        <View style={styles.formCard}>
          {/* Select Movie Trigger */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Movie</Text>
            <TouchableOpacity
              style={[styles.input, styles.selectTrigger, errors.movieId && styles.inputError]}
              onPress={() => setMovieModalVisible(true)}
            >
              <Text style={[styles.selectText, !selectedMovie && { color: COLORS.textDim }]}>
                {selectedMovie ? selectedMovie.title : 'Select a movie...'}
              </Text>
              <Text style={styles.selectArrow}>▼</Text>
            </TouchableOpacity>
            {errors.movieId && <Text style={styles.errorText}>{errors.movieId}</Text>}
          </View>

          {/* Screening Date */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Screening Date (YYYY-MM-DD)</Text>
            <TextInput
              style={[styles.input, errors.date && styles.inputError]}
              placeholder="e.g. 2026-07-20"
              placeholderTextColor={COLORS.textDim}
              value={date}
              onChangeText={setDate}
            />
            {errors.date && <Text style={styles.errorText}>{errors.date}</Text>}
          </View>

          {/* Start Time */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Time (HH:MM - 24h format)</Text>
            <TextInput
              style={[styles.input, errors.startTime && styles.inputError]}
              placeholder="e.g. 18:30"
              placeholderTextColor={COLORS.textDim}
              value={startTime}
              onChangeText={setStartTime}
            />
            {errors.startTime && <Text style={styles.errorText}>{errors.startTime}</Text>}
          </View>

          {/* Cinema Room Segment Control */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cinema Room</Text>
            <View style={styles.roomSegmentContainer}>
              {ROOMS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[
                    styles.roomSegment,
                    room === r && styles.activeRoomSegment
                  ]}
                  onPress={() => setRoom(r)}
                >
                  <Text
                    style={[
                      styles.roomSegmentText,
                      room === r && styles.activeRoomSegmentText
                    ]}
                  >
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Total Seats */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Total Seat Capacity</Text>
            <TextInput
              style={[styles.input, errors.totalSeats && styles.inputError]}
              placeholder="e.g. 50"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
              value={totalSeats}
              onChangeText={setTotalSeats}
            />
            {errors.totalSeats && <Text style={styles.errorText}>{errors.totalSeats}</Text>}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddSchedule}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>Create Schedule</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Custom Movie Selection Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={movieModalVisible}
        onRequestClose={() => setMovieModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Movie</Text>
              <TouchableOpacity onPress={() => setMovieModalVisible(false)}>
                <Text style={styles.modalCloseButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={state.movies}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.movieSelectItem}
                  onPress={() => handleSelectMovie(item)}
                >
                  <Text style={styles.movieSelectTitle}>{item.title}</Text>
                  <Text style={styles.movieSelectGenre}>
                    {item.genre} • {item.duration} mins • {item.ageRating}
                  </Text>
                </TouchableOpacity>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No movies available.</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: SPACING.xl,
  },
  formCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.xlarge,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.medium,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: SPACING.xs,
  },
  input: {
    backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.medium,
    borderColor: COLORS.border,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? SPACING.md : SPACING.sm,
    color: COLORS.white,
    fontSize: 16,
  },
  selectTrigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: {
    color: COLORS.white,
    fontSize: 16,
  },
  selectArrow: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  roomSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.medium,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roomSegment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.small,
  },
  activeRoomSegment: {
    backgroundColor: COLORS.primary,
  },
  roomSegmentText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
    fontSize: 12,
  },
  activeRoomSegmentText: {
    color: COLORS.black,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.md,
    gap: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.medium,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: COLORS.textMuted,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 2,
    borderRadius: BORDER_RADIUS.medium,
    overflow: 'hidden',
    ...SHADOWS.glow,
  },
  submitGradient: {
    paddingVertical: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: BORDER_RADIUS.xlarge,
    borderTopRightRadius: BORDER_RADIUS.xlarge,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
    maxHeight: '70%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCloseButton: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: 'bold',
    padding: SPACING.xs,
  },
  movieSelectItem: {
    paddingVertical: SPACING.md,
  },
  movieSelectTitle: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  movieSelectGenre: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
});
