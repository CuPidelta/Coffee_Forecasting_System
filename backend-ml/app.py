from flask import Flask, request, jsonify
import pickle
import pandas as pd
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Para payagan ang koneksyon mula sa frontend/Node.js server

# I-load ang trained model at mga columns
with open('coffee_model.pkl', 'rb') as f:
    model = pickle.load(f)

with open('model_columns.pkl', 'rb') as f:
    model_columns = pickle.load(f)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        # Gumawa ng default structure na puro zero para sa one-hot encoding
        input_data = pd.DataFrame(0, index=[0], columns=model_columns)
        
        # I-set ang mga basic numerical inputs
        input_data['day_of_week'] = int(data['day_of_week'])
        input_data['month'] = int(data['month'])
        input_data['is_weekend'] = 1 if int(data['day_of_week']) >= 5 else 0
        input_data['hour'] = int(data['hour'])
        input_data['unit_price'] = float(data['unit_price'])
        
        # I-activate ang tamang one-hot encoded variable para sa lokasyon at kategorya
        store_col = f"store_location_{data['store_location']}"
        category_col = f"product_category_{data['product_category']}"
        
        if store_col in input_data.columns:
            input_data[store_col] = 1
        if category_col in input_data.columns:
            input_data[category_col] = 1
            
        # Isagawa ang prediksyon
        prediction = model.predict(input_data)[0]
        
       
        return jsonify({
            'success': True, 
            'predicted_sales': round(prediction, 2),
            'message': 'Prediction successful'
        })
        
    except Exception as e:
       
        return jsonify({
            'success': False, 
            'message': str(e)
        })

if __name__ == '__main__':
    app.run(port=5000, debug=True)