#!/usr/bin/env python3
"""
Neural Spaced Mastery (NSM) - Model Prediction Service
Makes predictions using trained ML model
"""

import os
import json
import sys
import numpy as np
import tensorflow as tf
from tensorflow import keras
import pickle

# Load model and scaler
model_dir = os.path.join(os.path.dirname(__file__), 'models')
model_path = os.path.join(model_dir, 'nsm_model.keras')
scaler_path = os.path.join(model_dir, 'scaler.pkl')
metadata_path = os.path.join(model_dir, 'metadata.json')

# Global model cache
_model = None
_scaler = None
_metadata = None

def load_model():
    """Load trained model, scaler, and metadata"""
    global _model, _scaler, _metadata
    
    if _model is None:
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Train model first.")
        
        _model = keras.models.load_model(model_path)
        
        with open(scaler_path, 'rb') as f:
            _scaler = pickle.load(f)
        
        with open(metadata_path, 'r') as f:
            _metadata = json.load(f)
    
    return _model, _scaler, _metadata

def predict_interval(feature_data):
    """
    Predict optimal review interval using trained ML model
    
    Args:
        feature_data: dict with input features
    
    Returns:
        dict with prediction and confidence
    """
    try:
        # Load model
        model, scaler, metadata = load_model()
        
        # Extract features in same order as training (17 features total)
        features = [
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
        
        # Convert to numpy array and reshape
        X = np.array([features])
        
        # Scale features
        X_scaled = scaler.transform(X)
        
        # Predict
        prediction = model.predict(X_scaled, verbose=0)[0][0]
        
        # Clip to reasonable bounds (1-180 days)
        predicted_interval = float(np.clip(prediction, 1, 180))
        
        # Calculate confidence (inverse of prediction uncertainty)
        # Higher confidence when prediction is closer to typical intervals
        typical_interval = feature_data.get('current_interval', 1) * 2
        uncertainty = abs(predicted_interval - typical_interval) / typical_interval
        confidence = max(0.5, 1.0 - uncertainty * 0.5)  # 0.5-1.0 range
        
        return {
            'success': True,
            'predicted_interval': predicted_interval,
            'confidence': confidence,
            'model_version': metadata.get('model_version'),
            'trained_at': metadata.get('trained_at'),
            'method': 'neural_network'
        }
    
    except FileNotFoundError as e:
        return {
            'success': False,
            'error': str(e),
            'fallback_to_rules': True
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': f"Prediction error: {str(e)}",
            'fallback_to_rules': True
        }

def get_model_status():
    """Check if model is trained and ready"""
    try:
        model, scaler, metadata = load_model()
        return {
            'success': True,
            'model_available': True,
            'model_version': metadata.get('model_version'),
            'trained_at': metadata.get('trained_at'),
            'training_samples': metadata.get('training_samples'),
            'validation_mae': metadata.get('val_mae')
        }
    except:
        return {
            'success': True,
            'model_available': False,
            'message': 'Model not trained yet. Using rule-based fallback.'
        }

# CLI interface
if __name__ == '__main__':
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'status':
            result = get_model_status()
            print(json.dumps(result, indent=2))
        
        elif command == 'predict':
            # Read feature data from stdin
            feature_data = json.load(sys.stdin)
            result = predict_interval(feature_data)
            print(json.dumps(result, indent=2))
        
        else:
            print(json.dumps({'error': f'Unknown command: {command}'}))
    else:
        print(json.dumps({'error': 'No command specified'}))

