"""
ML Model Training Pipeline
Train Random Forest classifier for flood prediction
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    classification_report, 
    confusion_matrix, 
    accuracy_score, 
    roc_auc_score,
    roc_curve,
    precision_recall_curve,
    f1_score
)
import joblib
from pathlib import Path
import sys

# Add configs to path
sys.path.append(str(Path(__file__).parent.parent / 'configs'))
from config import (
    PROCESSED_DATA_DIR, 
    MODELS_DIR, 
    FEATURE_COLUMNS, 
    TARGET_COLUMN,
    RF_N_ESTIMATORS,
    RF_MAX_DEPTH,
    RF_MIN_SAMPLES_SPLIT,
    RF_MIN_SAMPLES_LEAF,
    RF_RANDOM_STATE,
    TEST_SIZE
)

# Set style
sns.set_style('whitegrid')
plt.rcParams['figure.figsize'] = (10, 6)


def load_clean_data():
    """Load preprocessed training data"""
    filepath = PROCESSED_DATA_DIR / 'flood_training_clean.csv'
    
    if not filepath.exists():
        print(f"❌ Clean data not found: {filepath}")
        print("Run eda_analysis.py first!")
        return None
    
    df = pd.read_csv(filepath)
    print(f"✓ Loaded clean dataset: {len(df)} samples")
    return df


def prepare_features_labels(df):
    """Extract features and labels"""
    X = df[FEATURE_COLUMNS].values
    y = df[TARGET_COLUMN].values
    
    print(f"\n✓ Features (X): {X.shape}")
    print(f"✓ Labels (y): {y.shape}")
    print(f"✓ Feature columns: {FEATURE_COLUMNS}")
    
    return X, y


def split_data(X, y):
    """Split into train and test sets"""
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, 
        test_size=TEST_SIZE, 
        random_state=RF_RANDOM_STATE,
        stratify=y  # Maintain class balance
    )
    
    print(f"\n✓ Train set: {X_train.shape[0]} samples")
    print(f"✓ Test set:  {X_test.shape[0]} samples")
    print(f"✓ Train flood ratio: {y_train.sum()/len(y_train):.2%}")
    print(f"✓ Test flood ratio:  {y_test.sum()/len(y_test):.2%}")
    
    return X_train, X_test, y_train, y_test


def train_model(X_train, y_train):
    """Train Random Forest classifier"""
    print("\n" + "="*60)
    print("🌲 TRAINING RANDOM FOREST MODEL")
    print("="*60)
    
    print(f"\nHyperparameters:")
    print(f"  n_estimators: {RF_N_ESTIMATORS}")
    print(f"  max_depth: {RF_MAX_DEPTH}")
    print(f"  min_samples_split: {RF_MIN_SAMPLES_SPLIT}")
    print(f"  min_samples_leaf: {RF_MIN_SAMPLES_LEAF}")
    print(f"  random_state: {RF_RANDOM_STATE}")
    
    model = RandomForestClassifier(
        n_estimators=RF_N_ESTIMATORS,
        max_depth=RF_MAX_DEPTH,
        min_samples_split=RF_MIN_SAMPLES_SPLIT,
        min_samples_leaf=RF_MIN_SAMPLES_LEAF,
        random_state=RF_RANDOM_STATE,
        n_jobs=-1,
        verbose=1
    )
    
    print("\n⏳ Training in progress...")
    model.fit(X_train, y_train)
    print("✓ Training complete!")
    
    return model


def evaluate_model(model, X_train, X_test, y_train, y_test):
    """Comprehensive model evaluation"""
    print("\n" + "="*60)
    print("📊 MODEL EVALUATION")
    print("="*60)
    
    # Predictions
    y_train_pred = model.predict(X_train)
    y_test_pred = model.predict(X_test)
    
    y_train_proba = model.predict_proba(X_train)[:, 1]
    y_test_proba = model.predict_proba(X_test)[:, 1]
    
    # Metrics
    train_acc = accuracy_score(y_train, y_train_pred)
    test_acc = accuracy_score(y_test, y_test_pred)
    
    train_f1 = f1_score(y_train, y_train_pred)
    test_f1 = f1_score(y_test, y_test_pred)
    
    train_roc = roc_auc_score(y_train, y_train_proba)
    test_roc = roc_auc_score(y_test, y_test_proba)
    
    print(f"\n{'Metric':<20} {'Train':<15} {'Test':<15}")
    print("-" * 50)
    print(f"{'Accuracy':<20} {train_acc:<15.4f} {test_acc:<15.4f}")
    print(f"{'F1-Score':<20} {train_f1:<15.4f} {test_f1:<15.4f}")
    print(f"{'ROC-AUC':<20} {train_roc:<15.4f} {test_roc:<15.4f}")
    
    # Confusion Matrix
    print("\n--- Test Set Confusion Matrix ---")
    cm = confusion_matrix(y_test, y_test_pred)
    print(cm)
    print(f"\nTrue Negatives:  {cm[0,0]}")
    print(f"False Positives: {cm[0,1]}")
    print(f"False Negatives: {cm[1,0]}")
    print(f"True Positives:  {cm[1,1]}")
    
    # Classification Report
    print("\n--- Test Set Classification Report ---")
    print(classification_report(y_test, y_test_pred, target_names=['No Flood', 'Flood']))
    
    return {
        'train_acc': train_acc,
        'test_acc': test_acc,
        'train_f1': train_f1,
        'test_f1': test_f1,
        'train_roc': train_roc,
        'test_roc': test_roc,
        'y_test': y_test,
        'y_test_pred': y_test_pred,
        'y_test_proba': y_test_proba
    }


def plot_confusion_matrix(y_test, y_test_pred):
    """Plot confusion matrix heatmap"""
    cm = confusion_matrix(y_test, y_test_pred)
    
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=['No Flood', 'Flood'],
                yticklabels=['No Flood', 'Flood'],
                cbar_kws={'label': 'Count'})
    plt.title('Confusion Matrix - Test Set', fontsize=14, fontweight='bold')
    plt.ylabel('True Label')
    plt.xlabel('Predicted Label')
    plt.tight_layout()
    
    output_path = Path(__file__).parent.parent / 'data' / 'outputs' / 'confusion_matrix.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"\n✓ Saved: {output_path}")
    plt.close()


def plot_roc_curve(y_test, y_test_proba):
    """Plot ROC curve"""
    fpr, tpr, thresholds = roc_curve(y_test, y_test_proba)
    roc_auc = roc_auc_score(y_test, y_test_proba)
    
    plt.figure(figsize=(8, 6))
    plt.plot(fpr, tpr, color='blue', lw=2, label=f'ROC Curve (AUC = {roc_auc:.3f})')
    plt.plot([0, 1], [0, 1], color='red', lw=2, linestyle='--', label='Random Classifier')
    plt.xlim([0.0, 1.0])
    plt.ylim([0.0, 1.05])
    plt.xlabel('False Positive Rate', fontsize=12)
    plt.ylabel('True Positive Rate', fontsize=12)
    plt.title('ROC Curve - Test Set', fontsize=14, fontweight='bold')
    plt.legend(loc='lower right')
    plt.grid(alpha=0.3)
    plt.tight_layout()
    
    output_path = Path(__file__).parent.parent / 'data' / 'outputs' / 'roc_curve.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"✓ Saved: {output_path}")
    plt.close()


def plot_feature_importance(model):
    """Plot feature importance"""
    importance_df = pd.DataFrame({
        'feature': FEATURE_COLUMNS,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n" + "="*60)
    print("🎯 FEATURE IMPORTANCE")
    print("="*60)
    print(importance_df.to_string(index=False))
    
    # Plot
    plt.figure(figsize=(10, 6))
    colors = sns.color_palette("viridis", len(FEATURE_COLUMNS))
    plt.barh(importance_df['feature'], importance_df['importance'], color=colors)
    plt.xlabel('Importance Score', fontsize=12)
    plt.ylabel('Feature', fontsize=12)
    plt.title('Feature Importance - Random Forest', fontsize=14, fontweight='bold')
    plt.gca().invert_yaxis()
    plt.grid(axis='x', alpha=0.3)
    plt.tight_layout()
    
    output_path = Path(__file__).parent.parent / 'data' / 'outputs' / 'feature_importance.png'
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    print(f"\n✓ Saved: {output_path}")
    plt.close()


def save_model(model):
    """Save trained model to disk"""
    output_path = MODELS_DIR / 'random_forest_flood_model.pkl'
    joblib.dump(model, output_path)
    
    file_size = output_path.stat().st_size / 1024  # KB
    print(f"\n✓ Model saved: {output_path}")
    print(f"✓ File size: {file_size:.2f} KB")


def save_training_report(metrics):
    """Save training summary report"""
    report = []
    report.append("="*60)
    report.append("FLOOD PREDICTION MODEL - TRAINING REPORT")
    report.append("="*60)
    report.append(f"\nModel: Random Forest Classifier")
    report.append(f"Training samples: 1000")
    report.append(f"Test samples: 250")
    report.append(f"\nHyperparameters:")
    report.append(f"  n_estimators: {RF_N_ESTIMATORS}")
    report.append(f"  max_depth: {RF_MAX_DEPTH}")
    report.append(f"  min_samples_split: {RF_MIN_SAMPLES_SPLIT}")
    report.append(f"  min_samples_leaf: {RF_MIN_SAMPLES_LEAF}")
    report.append(f"\nPerformance Metrics:")
    report.append(f"  Train Accuracy: {metrics['train_acc']:.4f}")
    report.append(f"  Test Accuracy:  {metrics['test_acc']:.4f}")
    report.append(f"  Train F1-Score: {metrics['train_f1']:.4f}")
    report.append(f"  Test F1-Score:  {metrics['test_f1']:.4f}")
    report.append(f"  Train ROC-AUC:  {metrics['train_roc']:.4f}")
    report.append(f"  Test ROC-AUC:   {metrics['test_roc']:.4f}")
    report.append(f"\n✓ Model shows {'good generalization' if abs(metrics['train_acc'] - metrics['test_acc']) < 0.05 else 'potential overfitting'}")
    report.append("\n" + "="*60)
    
    report_text = "\n".join(report)
    
    output_path = Path(__file__).parent.parent / 'data' / 'outputs' / 'training_report.txt'
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(report_text)
    
    print("\n" + report_text)
    print(f"\n✓ Report saved: {output_path}")


def main():
    """Main training pipeline"""
    print("\n" + "="*60)
    print("🌊 FLOOD PREDICTION - MODEL TRAINING")
    print("="*60)
    
    # Load data
    df = load_clean_data()
    if df is None:
        return
    
    # Prepare features and labels
    X, y = prepare_features_labels(df)
    
    # Split data
    X_train, X_test, y_train, y_test = split_data(X, y)
    
    # Train model
    model = train_model(X_train, y_train)
    
    # Evaluate
    metrics = evaluate_model(model, X_train, X_test, y_train, y_test)
    
    # Visualizations
    plot_confusion_matrix(metrics['y_test'], metrics['y_test_pred'])
    plot_roc_curve(metrics['y_test'], metrics['y_test_proba'])
    plot_feature_importance(model)
    
    # Save model
    save_model(model)
    
    # Save report
    save_training_report(metrics)
    
    print("\n" + "="*60)
    print("✅ TRAINING COMPLETE!")
    print("="*60)
    print("\nGenerated Files:")
    print("  📊 confusion_matrix.png")
    print("  📊 roc_curve.png")
    print("  📊 feature_importance.png")
    print("  📄 training_report.txt")
    print("  💾 random_forest_flood_model.pkl")
    print("\n✓ Ready for Phase 4: GEE Integration & Testing")


if __name__ == "__main__":
    main()
