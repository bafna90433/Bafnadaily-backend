import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const test = async () => {
    const phone = '7550350036';
    const otp = '999999';
    console.log('Testing MSG91 OTP...');
    
    try {
        const response = await axios.post(
          'https://control.msg91.com/api/v5/otp',
          { template_id: process.env.MSG91_TEMPLATE_ID, mobile: `91${phone}`, otp: otp },
          { headers: { 'authkey': process.env.MSG91_AUTHKEY, 'Content-Type': 'application/json' } }
        );
        console.log('📱 MSG91 Success Response:', response.data);
    } catch (error: any) {
        if (error.response) {
            console.error('❌ MSG91 Error Response Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('❌ MSG91 Request Error:', error.message);
        }
    }
}

test();
