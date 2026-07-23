import React from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, StatusBar } from 'react-native';
import { useCinema } from '../context/CinemaContext';
import { COLORS, BORDER_RADIUS, SPACING, SHADOWS } from '../styles/theme';

export default function MovieList({ navigation }) {
  const { state } = useCinema();

  const getAgeRatingColor = (rating) => {
    switch (rating) {
      case 'P':
        return COLORS.success;
      case 'T13':
        return '#3B82F6';
      case 'T16':
        return '#F59E0B';
      case 'T18':
        return COLORS.danger;
      default:
        return COLORS.textMuted;
    }
  };

  const renderMovieItem = ({ item }) => {
    return (
      <View style={styles.movieCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.movieTitle}>{item.title}</Text>
          <View style={[styles.ratingTag, { borderColor: getAgeRatingColor(item.ageRating) }]}>
            <Text style={[styles.ratingText, { color: getAgeRatingColor(item.ageRating) }]}>
              {item.ageRating}
            </Text>
          </View>
        </View>
        
        <Text style={styles.movieGenre}>🎭 {item.genre}</Text>
        <Text style={styles.movieDuration}>🕒 {item.duration} minutes</Text>
        <Text style={styles.movieDescription} numberOfLines={2}>
          {item.description}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      <View style={styles.header}>
        <Text style={styles.headerTitle}>All Movies ({state.movies.length})</Text>
        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => navigation.navigate('MovieInput')}
        >
          <Text style={styles.addButtonText}>+ Add Movie</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={state.movies}
        keyExtractor={(item) => item.id}
        renderItem={renderMovieItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No movies found.</Text>
          </View>
        }
      />
    </View>
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
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderColor: COLORS.border,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.medium,
  },
  addButtonText: {
    color: COLORS.black,
    fontWeight: 'bold',
    fontSize: 13,
  },
  listContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  movieCard: {
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
    marginBottom: SPACING.sm,
  },
  movieTitle: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
    marginRight: SPACING.md,
  },
  ratingTag: {
    borderWidth: 1,
    borderRadius: BORDER_RADIUS.small,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  movieGenre: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: 4,
  },
  movieDuration: {
    color: COLORS.textMuted,
    fontSize: 14,
    marginBottom: SPACING.sm,
  },
  movieDescription: {
    color: COLORS.textDim,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
});
