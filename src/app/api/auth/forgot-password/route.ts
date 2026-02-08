
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action, email, otp, newPassword } = body;

        // Simulate database lookup
        // In a real app, you would check if the user exists in your database
        if (!email || !email.includes('@')) {
            return NextResponse.json({ success: false, message: 'Invalid email address' }, { status: 400 });
        }

        if (action === 'send_otp') {
            // Logic to generate and send OTP
            // For demo purposes, we'll just log it and return success
            console.log(`[Mock Auth] Sending OTP to ${email}. Mock OTP: 123456`);

            return NextResponse.json({
                success: true,
                message: 'OTP sent successfully'
            });
        }
        else if (action === 'reset_password') {
            // Logic to verify OTP and update password
            // For demo purposes, we accept any OTP that is '123456' or non-empty in dev
            if (otp === '123456' || (process.env.NODE_ENV === 'development' && otp.length >= 4)) {
                console.log(`[Mock Auth] Password for ${email} reset to ${newPassword}`);
                return NextResponse.json({
                    success: true,
                    message: 'Password reset successful'
                });
            } else {
                return NextResponse.json({ success: false, message: 'Invalid OTP' }, { status: 400 });
            }
        }

        return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });

    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json({ success: false, message: 'Server error processing request' }, { status: 500 });
    }
}
