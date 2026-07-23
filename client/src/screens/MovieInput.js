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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useCinema } from '../context/CinemaContext';
import { ACTION_TYPES } from '../CinemaReducer';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

const AGE_RATINGS = ['P', 'T13', 'T16', 'T18'];

export default function MovieInput({ navigation }) {
  const { dispatch } = useCinema();
  
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [duration, setDuration] = useState('');
  const [ageRating, setAgeRating] = useState('P');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState({});

  const validate = () => {
    let tempErrors = {};
    if (!title.trim()) tempErrors.title = 'Movie Title is required.';
    if (!genre.trim()) tempErrors.genre = 'Genre is required.';
    
    const parsedDuration = parseInt(duration, 10);
    if (!duration) {
      tempErrors.duration = 'Duration is required.';
    } else if (isNaN(parsedDuration) || parsedDuration <= 0) {
      tempErrors.duration = 'Duration must be a positive integer.';
    }
    
    if (!description.trim()) tempErrors.description = 'Description is required.';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleAddMovie = () => {
    if (!validate()) {
      return;
    }

    const payload = {
      title: title.trim(),
      genre: genre.trim(),
      duration: parseInt(duration, 10),
      ageRating,
      description: description.trim(),
    };

    dispatch({
      type: ACTION_TYPES.ADD_MOVIE,
      payload,
    });

    Alert.alert('Success', 'Movie added successfully!', [
      { text: 'OK', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.headerTitle}>Add New Movie</Text>
        
        <View style={styles.formCard}>
          
          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Movie Title</Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g. Inside Out 2"
              placeholderTextColor={COLORS.textDim}
              value={title}
              onChangeText={setTitle}
            />
            {errors.title && <Text style={styles.errorText}>{errors.title}</Text>}
          </View>

          {/* Genre */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Genre</Text>
            <TextInput
              style={[styles.input, errors.genre && styles.inputError]}
              placeholder="e.g. Animation / Comedy"
              placeholderTextColor={COLORS.textDim}
              value={genre}
              onChangeText={setGenre}
            />
            {errors.genre && <Text style={styles.errorText}>{errors.genre}</Text>}
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration (minutes)</Text>
            <TextInput
              style={[styles.input, errors.duration && styles.inputError]}
              placeholder="e.g. 96"
              placeholderTextColor={COLORS.textDim}
              keyboardType="number-pad"
              value={duration}
              onChangeText={setDuration}
            />
            {errors.duration && <Text style={styles.errorText}>{errors.duration}</Text>}
          </View>

          {/* Age Rating Custom Segment Control */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Age Rating</Text>
            <View style={styles.ratingSegmentContainer}>
              {AGE_RATINGS.map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={[
                    styles.ratingSegment,
                    ageRating === rating && styles.activeRatingSegment
                  ]}
                  onPress={() => setAgeRating(rating)}
                >
                  <Text
                    style={[
                      styles.ratingSegmentText,
                      ageRating === rating && styles.activeRatingSegmentText
                    ]}
                  >
                    {rating}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea, errors.description && styles.inputError]}
              placeholder="Write movie plot details..."
              placeholderTextColor={COLORS.textDim}
              multiline
              numberOfLines={4}
              value={description}
              onChangeText={setDescription}
            />
            {errors.description && <Text style={styles.errorText}>{errors.description}</Text>}
          </View>

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.cancelButton} 
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.submitButton} onPress={handleAddMovie}>
              <LinearGradient
                colors={['#F59E0B', '#D97706']}
                style={styles.submitGradient}
              >
                <Text style={styles.submitButtonText}>Add Movie</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

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
  inputError: {
    borderColor: COLORS.danger,
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 12,
    marginTop: 4,
  },
  ratingSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.backgroundDark,
    borderRadius: BORDER_RADIUS.medium,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ratingSegment: {
    flex: 1,
    paddingVertical: SPACING.sm,
    alignItems: 'center',
    borderRadius: BORDER_RADIUS.small,
  },
  activeRatingSegment: {
    backgroundColor: COLORS.primary,
  },
  ratingSegmentText: {
    color: COLORS.textMuted,
    fontWeight: 'bold',
    fontSize: 14,
  },
  activeRatingSegmentText: {
    color: COLORS.black,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
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
});
