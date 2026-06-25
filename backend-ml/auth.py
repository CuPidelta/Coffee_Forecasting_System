from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Para payagan ang koneksyon mula sa iyong HTML files

@app.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        username = data.get('username')
        password = data.get('password')
        
        # Hardcoded credentials para sa iyong system demo
        if username == "admin" and password == "coffee123":
            return jsonify({
                'success': True,
                'message': 'Access Granted',
                'role': 'Manager'
            })
        else:
            return jsonify({
                'success': False,
                'message': 'Maling Username o Password! Subukan ulit.'
            })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    # Tatakbo ito sa Port 5001 para magkahiwalay sila ng ML server
    app.run(port=5001, debug=True)