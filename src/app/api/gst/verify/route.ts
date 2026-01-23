
import { NextRequest, NextResponse } from 'next/server';

const GST_STATE_CODES: Record<string, string> = {
    "01": "Jammu and Kashmir",
    "02": "Himachal Pradesh",
    "03": "Punjab",
    "04": "Chandigarh",
    "05": "Uttarakhand",
    "06": "Haryana",
    "07": "Delhi",
    "08": "Rajasthan",
    "09": "Uttar Pradesh",
    "10": "Bihar",
    "11": "Sikkim",
    "12": "Arunachal Pradesh",
    "13": "Nagaland",
    "14": "Manipur",
    "15": "Mizoram",
    "16": "Tripura",
    "17": "Meghalaya",
    "18": "Assam",
    "19": "West Bengal",
    "20": "Jharkhand",
    "21": "Odisha",
    "22": "Chhattisgarh",
    "23": "Madhya Pradesh",
    "24": "Gujarat",
    "26": "Dadra and Nagar Haveli and Daman and Diu",
    "27": "Maharashtra",
    "28": "Andhra Pradesh (Old)",
    "29": "Karnataka",
    "30": "Goa",
    "31": "Lakshadweep",
    "32": "Kerala",
    "33": "Tamil Nadu",
    "34": "Puducherry",
    "35": "Andaman and Nicobar Islands",
    "36": "Telangana",
    "37": "Andhra Pradesh (New)",
    "38": "Ladakh"
};

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const gstin = searchParams.get('gstin');

        if (!gstin || gstin.length !== 15) {
            return NextResponse.json({ success: false, message: 'Invalid GSTIN length. Must be 15 characters.' }, { status: 400 });
        }

        const stateCode = gstin.substring(0, 2);
        const stateName = GST_STATE_CODES[stateCode] || "Unknown State";

        // In a real production app, you would call a paid API like ClearTax or MastersIndia here.
        // For this implementation, we will use a common public lookup pattern if available, 
        // or provide a highly realistic mock that fetches real state data.

        // Attempting to fetch from a public-facing sandbox/free API if possible
        // Using a common placeholder that often works for small scale/dev use
        try {
            const response = await fetch(`https://api.gstincheck.xyz/check/${gstin}`, {
                next: { revalidate: 3600 } // Cache for an hour
            });

            if (response.ok) {
                const data = await response.json();
                // The structure of this API might vary, we normalize it
                if (data.status === "Success" || data.flag) {
                    return NextResponse.json({
                        success: true,
                        data: {
                            gstin: gstin,
                            tradeName: data.data?.lgnm || data.data?.tradeName || "Registered Business",
                            legalName: data.data?.lgnm || data.data?.legalName || "Registered Business",
                            address: data.data?.pradr?.addr?.detail || data.data?.address || "",
                            state: stateName,
                            stateCode: stateCode,
                            status: data.data?.sts || "Active"
                        }
                    });
                }
            }
        } catch (e) {
            console.warn("External GST API failed, falling back to basic extraction", e);
        }

        // Fallback: If external API fails, we still provide the State info extracted from GSTIN
        // which is often 90% of what's needed for "Place of Supply" and manual verification.
        return NextResponse.json({
            success: true,
            data: {
                gstin: gstin,
                tradeName: `GST Entity (${stateName})`,
                state: stateName,
                stateCode: stateCode,
                isPartial: true,
                message: "Fetched state info. Manual verification recommended."
            }
        });

    } catch (error) {
        console.error("GST Verification Error:", error);
        return NextResponse.json({ success: false, message: 'Server error during GST verification.' }, { status: 500 });
    }
}
