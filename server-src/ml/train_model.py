#!/usr/bin/env python3
"""
Neural Spaced Mastery (NSM) - Real ML Model Training
Learns optimal review intervals from user data
"""

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import psycopg2
from datetime import datetime
import pickle

# Database connection
def get_db_connection():
    """Connect to PostgreSQL database"""
    database_url = os.environ.get('DATABASE_URL')
    if not database_url:
        raise ValueError("DATABASE_URL not set")
    return psycopg2.connect(database_url)

# Feature extraction
def extract_features(training_data):
    """
    Extract features from training data
    
    Input features:
    - item_difficulty (0-1)
    - user_mastery (0-1)
    - days_since_last_review
    - response_time_seconds
    - quality_rating (0-5)
    - repetition_count
    - current_ease_factor
    - current_interval
    - hour_of_day (0-23)
    - day_of_week (0-6)
    - time_since_learning_start (days)
    - previous_interval (if exists)
    - learning_pace (fast/medium/slow → 2/1/0)
    - cluster_mastery (average mastery of related items)
    - is_quiz (0 or 1)
    - quiz_score (0-100, 0 if not quiz)
    - quiz_questions_count (0 if not quiz)
    
    Target:
    - optimal_next_interval (days)
    """
    features = []
    targets = []
    
    for row in training_data:
        feature_data = row['feature_data']
        outcome_data = row['outcome_data']
        
        # Extract features
        feature_vector = [
            feature_data.get('item_difficulty', 0.5),
            feature_data.get('user_mastery', 0.5),
            feature_data.get('days_since_last_review', 0),
            feature_data.get('response_time_seconds', 5),
            feature_data.get('quality_rating', 3),
            feature_data.get('repetition_count', 0),
            feature_data.get('current_ease_factor', 2.5),
            feature_data.get('current_interval', 1),
            feature_data.get('hour_of_day', 12),
            feature_data.get('day_of_week', 3),
            feature_data.get('time_since_learning_start', 0),
            feature_data.get('previous_interval', 0),
            {'fast': 2, 'medium': 1, 'slow': 0}.get(feature_data.get('learning_pace', 'medium'), 1),
            feature_data.get('cluster_mastery', 0.5),
            feature_data.get('is_quiz', 0),
            feature_data.get('quiz_score', 0),
            feature_data.get('quiz_questions_count', 0),
        ]
        
        # Target: actual interval that was effective
        # (Based on whether user remembered or forgot next time)
        target_interval = outcome_data.get('next_interval', 1)
        
        features.append(feature_vector)
        targets.append(target_interval)
    
    return np.array(features), np.array(targets)

# Build model
def build_model(input_dim):
    """
    Neural network for predicting optimal review intervals
    
    Architecture:
    - Input layer (14 features)
    - 3 hidden layers with dropout for regularization
    - Output layer (1 value: predicted interval in days)
    """
    model = keras.Sequential([
        # Input layer
        keras.layers.Input(shape=(input_dim,)),
        
        # Hidden layer 1: Learn basic patterns
        keras.layers.Dense(64, activation='relu'),
        keras.layers.BatchNormalization(),
        keras.layers.Dropout(0.3),
        
        # Hidden layer 2: Learn complex interactions
        keras.layers.Dense(32, activation='relu'),
        keras.layers.BatchNormalization(),
        keras.layers.Dropout(0.2),
        
        # Hidden layer 3: Fine-tune predictions
        keras.layers.Dense(16, activation='relu'),
        keras.layers.Dropout(0.1),
        
        # Output layer: Predict interval (positive values only)
        keras.layers.Dense(1, activation='exponential')  # Ensures positive output
    ])
    
    # Compile model
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=0.001),
        loss='mse',  # Mean squared error for regression
        metrics=['mae']  # Mean absolute error for monitoring
    )
    
    return model

# Training pipeline
def train_nsm_model(min_samples=500):
    """
    Train the NSM model on collected data
    
    Args:
        min_samples: Minimum number of training examples needed
    
    Returns:
        dict with status and metrics
    """
    print(f"🧠 [NSM ML] Starting model training...")
    
    # Connect to database
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Fetch training data
    cursor.execute("""
        SELECT feature_data, outcome_data, recorded_at
        FROM ml_training_data
        ORDER BY recorded_at DESC
    """)
    
    rows = cursor.fetchall()
    conn.close()
    
    if len(rows) < min_samples:
        return {
            'success': False,
            'error': f'Not enough training data. Need {min_samples}, have {len(rows)}',
            'samples_collected': len(rows),
            'samples_needed': min_samples
        }
    
    print(f"✅ [NSM ML] Found {len(rows)} training examples")
    
    # Prepare data
    training_data = [{'feature_data': row[0], 'outcome_data': row[1]} for row in rows]
    X, y = extract_features(training_data)
    
    # Split data (80% train, 20% validation)
    X_train, X_val, y_train, y_val = train_test_split(
        X, y, test_size=0.2, random_state=42
    )
    
    # Normalize features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_val_scaled = scaler.transform(X_val)
    
    print(f"📊 [NSM ML] Training samples: {len(X_train)}, Validation samples: {len(X_val)}")
    
    # Build model
    model = build_model(input_dim=X_train_scaled.shape[1])
    
    # Early stopping to prevent overfitting
    early_stopping = keras.callbacks.EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    # Train model
    print(f"🏋️ [NSM ML] Training neural network...")
    history = model.fit(
        X_train_scaled, y_train,
        validation_data=(X_val_scaled, y_val),
        epochs=100,
        batch_size=32,
        callbacks=[early_stopping],
        verbose=1
    )
    
    # Evaluate model
    val_loss, val_mae = model.evaluate(X_val_scaled, y_val, verbose=0)
    
    print(f"✅ [NSM ML] Training complete!")
    print(f"   Validation MAE: {val_mae:.2f} days")
    print(f"   Validation Loss: {val_loss:.2f}")
    
    # Save model and scaler
    model_dir = os.path.join(os.path.dirname(__file__), 'models')
    os.makedirs(model_dir, exist_ok=True)
    
    model_path = os.path.join(model_dir, 'nsm_model.keras')
    scaler_path = os.path.join(model_dir, 'scaler.pkl')
    
    model.save(model_path)
    with open(scaler_path, 'wb') as f:
        pickle.dump(scaler, f)
    
    # Save metadata
    metadata = {
        'trained_at': datetime.now().isoformat(),
        'training_samples': len(X_train),
        'validation_samples': len(X_val),
        'val_mae': float(val_mae),
        'val_loss': float(val_loss),
        'model_version': '1.0',
        'feature_count': X_train_scaled.shape[1]
    }
    
    metadata_path = os.path.join(model_dir, 'metadata.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)
    
    print(f"💾 [NSM ML] Model saved to {model_path}")
    
    return {
        'success': True,
        'training_samples': len(X_train),
        'validation_samples': len(X_val),
        'val_mae': float(val_mae),
        'val_loss': float(val_loss),
        'model_path': model_path
    }

# Main execution
if __name__ == '__main__':
    result = train_nsm_model(min_samples=500)
    print(json.dumps(result, indent=2))

