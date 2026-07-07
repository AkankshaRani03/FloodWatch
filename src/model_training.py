"""
Machine Learning Model Training Module
Trains Random Forest classifier for flood prediction
"""

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score, roc_auc_score
import joblib
from pathlib import Path


def train_random_forest(X, y, n_estimators=100, random_state=42):
    """
    Train Random Forest classifier
    
    Args:
        X (np.array): Feature matrix
        y (np.array): Label vector
        n_estimators (int): Number of trees
        random_state (int): Random seed
        
    Returns:
        RandomForestClassifier: Trained model
    """
    print(f"\n🌲 Training Random Forest with {n_estimators} trees...")
    
    model = RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=10,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=random_state,
        n_jobs=-1
    )
    
    model.fit(X, y)
    print("✓ Training complete!")
    
    return model


def evaluate_model(model, X_test, y_test):
    """
    Evaluate model performance
    
    Args:
        model: Trained model
        X_test: Test features
        y_test: Test labels
        
    Returns:
        dict: Evaluation metrics
    """
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)[:, 1]
    
    accuracy = accuracy_score(y_test, y_pred)
    roc_auc = roc_auc_score(y_test, y_proba)
    
    print("\n" + "="*50)
    print("📊 MODEL EVALUATION")
    print("="*50)
    print(f"Accuracy: {accuracy:.4f}")
    print(f"ROC-AUC: {roc_auc:.4f}")
    print("\nConfusion Matrix:")
    print(confusion_matrix(y_test, y_pred))
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=['No Flood', 'Flood']))
    
    return {
        'accuracy': accuracy,
        'roc_auc': roc_auc,
        'y_pred': y_pred,
        'y_proba': y_proba
    }


def get_feature_importance(model, feature_names):
    """
    Get and display feature importance
    
    Args:
        model: Trained model
        feature_names (list): Names of features
        
    Returns:
        pd.DataFrame: Feature importance dataframe
    """
    importance_df = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "="*50)
    print("🎯 FEATURE IMPORTANCE")
    print("="*50)
    print(importance_df.to_string(index=False))
    
    return importance_df


def save_model(model, filepath):
    """
    Save trained model to disk
    
    Args:
        model: Trained model
        filepath (str): Path to save model
    """
    joblib.dump(model, filepath)
    print(f"\n✓ Model saved to: {filepath}")


def load_model(filepath):
    """
    Load trained model from disk
    
    Args:
        filepath (str): Path to model file
        
    Returns:
        Trained model
    """
    model = joblib.load(filepath)
    print(f"✓ Model loaded from: {filepath}")
    return model


if __name__ == "__main__":
    print("⚠️ This module should be imported, not run directly.")
    print("Use the training pipeline in notebooks or main training script.")
