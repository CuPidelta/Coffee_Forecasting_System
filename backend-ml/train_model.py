import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score


print("Machine Learning Pipeline Started...")
# STEP 1: Load the Dataset
df = pd.read_csv('dataset/Coffee_Shop_Sales.csv')

# STEP 2: Exploratory Data Analysis (EDA) & Feature Engineering
# Convert date to datetime format to extract time-based features
df['transaction_date'] = pd.to_datetime(df['transaction_date'], dayfirst=True)
df['day_of_week'] = df['transaction_date'].dt.dayofweek  # 0=Monday, 6=Sunday
df['month'] = df['transaction_date'].dt.month
df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
# Extract hour from transaction_time
df['hour'] = pd.to_datetime(df['transaction_time'], format='%H:%M:%S').dt.hour


# Aggregate data to get total sales metrics per hour, location, and product category
ml_data = df.groupby(['store_location', 'product_category', 'day_of_week', 'month', 'is_weekend', 'hour']).agg({
    'transaction_qty': 'sum',
    'unit_price': 'mean'
}).reset_index()

# Calculate Total Revenue as our Target y
ml_data['total_sales_amount'] = ml_data['transaction_qty'] * ml_data['unit_price']
print(f"Data size after aggregation: {ml_data.shape[0]} rows")

# STEP 3: Data Preprocessing (One-Hot Encoding for categorical text columns)
# Converts 'store_location' and 'product_category' into numerical dummy features
ml_data_encoded = pd.get_dummies(ml_data, columns=['store_location', 'product_category'], drop_first=False)

# Save the list of columns for later use in the Flask API
model_columns = list(ml_data_encoded.columns)
model_columns.remove('transaction_qty')
model_columns.remove('total_sales_amount')
with open('model_columns.pkl', 'wb') as f:
    pickle.dump(model_columns, f)

# STEP 4: Split Input Features (X) and Target Output (y)
X = ml_data_encoded[model_columns]
y = ml_data_encoded['total_sales_amount']  # This is our y target vector (Predicted Sales Amount)

# STEP 5: Training and Testing Split (80% Train, 20% Test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# STEP 6: Building and Training the Model
print("Training the Random Forest Regressor Model...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("Model training complete!")

# STEP 7: Evaluation (Testing)
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
mse = mean_squared_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

# Avoid division by zero by replacing any actual 0 sales values with a tiny epsilon (or dropping them)
y_test_safe = np.where(y_test == 0, 1e-5, y_test)
# Calculate Mean Absolute Percentage Error (MAPE)
mape = np.mean(np.abs((y_test - y_pred) / y_test_safe))
# Calculate Regression Accuracy Score
regression_accuracy = (1.0 - mape) * 100

print(f"\n--- MODEL PERFORMANCE METRICS ---")
print(f"Mean Absolute Error (MAE): ₱{mae:.2f}")
print(f"Mean Squared Error (MSE): {mse:.2f}")
print(f"R-squared (Explained Variance): {r2 * 100:.2f}%")
print(f"Model Prediction Accuracy: {regression_accuracy:.2f}%") # This tells you true accuracy

# STEP 8: Save the Trained Model
with open('coffee_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model and columns saved successfully!") 

