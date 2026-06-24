import pandas as pd
import numpy as np
import pickle
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score

print("--- Simula ng Machine Learning Pipeline ---")

# STEP 1: Load the Dataset
df = pd.read_csv('dataset/Coffee_Shop_Sales.csv')

# STEP 2: Exploratory Data Analysis (EDA) & Feature Engineering
# Convert date sa datetime format para makuha ang mga time-based features
df['transaction_date'] = pd.to_datetime(df['transaction_date'], dayfirst=True)
df['day_of_week'] = df['transaction_date'].dt.dayofweek  # 0=Monday, 6=Sunday
df['month'] = df['transaction_date'].dt.month
df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)

# Kuhanin ang oras (Hour) mula sa transaction_time
df['hour'] = pd.to_datetime(df['transaction_time'], format='%H:%M:%S').dt.hour

# Pagsamahin (Aggregate) ang data para makuha ang Kabuuang Benta kada Oras, kada Lokasyon, at kada Kategorya
ml_data = df.groupby(['store_location', 'product_category', 'day_of_week', 'month', 'is_weekend', 'hour']).agg({
    'transaction_qty': 'sum',
    'unit_price': 'mean'
}).reset_index()

# I-calculate ang Kabuuang Kita (Total Revenue) bilang ating Target Y
ml_data['total_sales_amount'] = ml_data['transaction_qty'] * ml_data['unit_price']

print(f"Laki ng data pagkatapos ng aggregation: {ml_data.shape[0]} rows")

# STEP 3: Data Preprocessing (One-Hot Encoding para sa mga Text columns)
# Ginagawa nitong numero ang 'store_location' at 'product_category'
ml_data_encoded = pd.get_dummies(ml_data, columns=['store_location', 'product_category'], drop_first=False)

# I-save ang listahan ng mga columns para sa Flask API mamaya
model_columns = list(ml_data_encoded.columns)
model_columns.remove('transaction_qty')
model_columns.remove('total_sales_amount')

with open('model_columns.pkl', 'wb') as f:
    pickle.dump(model_columns, f)

# STEP 4: Paghiwalayin ang Input (X) at Output (Y)
X = ml_data_encoded[model_columns]
y = ml_data_encoded['total_sales_amount']  # Ito ang ating Y (Huhulaang Halaga ng Benta)

# STEP 5: Training and Testing Split (80% Train, 20% Test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# STEP 6: Building and Training the Model
print("Sinasanay na ang Random Forest Regressor Model...")
model = RandomForestRegressor(n_estimators=100, random_state=42)
model.fit(X_train, y_train)
print("Tapos na ang pag-train sa model!")

# STEP 7: Evaluation (Testing)
y_pred = model.predict(X_test)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print(f"\n--- MODEL PERFORMANCE METRICS ---")
print(f"Mean Absolute Error (MAE): ₱{mae:.2f}")
print(f"R-squared (Accuracy) Score: {r2 * 100:.2f}%")

# STEP 8: Save the Trained Model
with open('coffee_model.pkl', 'wb') as f:
    pickle.dump(model, f)
print("Model at Columns ay matagumpay na nai-save!")