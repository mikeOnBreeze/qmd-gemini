# Machine Learning Fundamentals

## The ML Pipeline

A typical machine learning project follows these steps:

1. Problem definition and data collection
2. Data cleaning and preprocessing
3. Feature engineering
4. Splitting data for training and testing
5. Model selection and training
6. Evaluation and iteration
7. Deployment and monitoring

## Train/Test Split

Proper data splitting is critical. Never evaluate a model on data it was trained on.

**Standard split**:
- Training set: 70-80% of data
- Validation set: 10-15% for hyperparameter tuning
- Test set: 10-15% for final evaluation

**Cross-validation**: For smaller datasets, use k-fold cross-validation (typically k=5 or k=10) to maximize the use of available data.

**Time-series data**: Always split chronologically — training on past data, testing on future data. Random splits would leak future information.

## Overfitting and Underfitting

### Overfitting

Overfitting in machine learning occurs when a model memorizes the training data instead of learning generalizable patterns. Signs include:

- High training accuracy, low validation accuracy
- Large gap between training and validation loss
- Model performs well on seen data but poorly on new data

### How to Prevent Models from Memorizing Data

Strategies to combat overfitting:

1. **More data** — The simplest and most effective approach
2. **Regularization** — L1 (Lasso), L2 (Ridge), or Elastic Net penalties
3. **Dropout** — Randomly deactivate neurons during training (typically 20-50%)
4. **Early stopping** — Stop training when validation loss stops improving
5. **Data augmentation** — Create synthetic training examples
6. **Simpler models** — Reduce model capacity (fewer layers, fewer parameters)
7. **Cross-validation** — Ensure results are robust across different data splits

### Underfitting

Underfitting occurs when the model is too simple to capture the underlying patterns. Signs include low accuracy on both training and test sets.

## Evaluation Metrics

### Classification Metrics

**Accuracy**: Proportion of correct predictions. Misleading when classes are imbalanced.

**Precision**: Of all positive predictions, how many were actually positive?
```
Precision = True Positives / (True Positives + False Positives)
```

**Recall (Sensitivity)**: Of all actual positives, how many did we catch?
```
Recall = True Positives / (True Positives + False Negatives)
```

**F1 Score**: Harmonic mean of precision and recall. Useful when you need a single metric that balances both:
```
F1 = 2 * (Precision * Recall) / (Precision + Recall)
```

The F1 score ranges from 0 to 1, where 1 is perfect precision and recall. It's particularly useful for imbalanced datasets where accuracy alone is misleading.

**AUC-ROC**: Area under the Receiver Operating Characteristic curve. Measures the model's ability to distinguish between classes across all thresholds.

### Regression Metrics

- **MAE** (Mean Absolute Error) — Average absolute difference
- **MSE** (Mean Squared Error) — Penalizes large errors more
- **RMSE** (Root MSE) — Same units as the target variable
- **R²** (Coefficient of Determination) — Proportion of variance explained

## Common Algorithms

### Supervised Learning
- **Linear/Logistic Regression** — Simple, interpretable baselines
- **Decision Trees / Random Forests** — Handle non-linear relationships, feature importance
- **Gradient Boosting** (XGBoost, LightGBM) — State-of-the-art for tabular data
- **Neural Networks** — Deep learning for complex patterns (images, text, sequences)

### Unsupervised Learning
- **K-Means Clustering** — Partition data into k groups
- **PCA** (Principal Component Analysis) — Dimensionality reduction
- **Autoencoders** — Neural network-based compression and anomaly detection

## Feature Engineering

Good features are often more important than model choice:

- **Normalization/Scaling** — StandardScaler, MinMaxScaler
- **Encoding categoricals** — One-hot, label, target encoding
- **Handling missing data** — Imputation strategies
- **Feature selection** — Remove irrelevant or redundant features
- **Domain-specific features** — Leverage expert knowledge
