Checking for duplicate resumes...
Work experience fetch (bulk) error: { message: 'Bad Request' }
Education fetch (bulk) error: { message: 'Bad Request' }
Uploading to Supabase Storage...
Uploading file to Supabase Storage: 16553eaa-d05e-4625-ab4b-5de08323c21b-df5b82f9ff.pdf
✅ File uploaded to Supabase Storage: 
Generating embedding...
=== Generating Embedding ===
✅ Embedding generated successfully
✅ Embedding generated successfully
Adding to Supabase...
Error adding candidate: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'embedding' column of 'candidates' in the schema cache"
}
Failed to add candidate: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'embedding' column of 'candidates' in the schema cache"
}
Upload error: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'embedding' column of 'candidates' in the schema cache"
}
 POST /api/upload-resume 500 in 14.6s (compile: 15ms, render: 14.6s)


while uploading resume showing this "Processing failed: Internal server error during upload"
again work experience fetch bolk error education fetch bulk error 

this is the candidate row example 
"[{"idx":0,"id":"001be3a2-129f-48a7-b383-9c2424ef2109","name":"JAGESHWAR PRASAD","email":"jprasad276@gmail.com","phone":"7982532856","date_of_birth":null,"gender":null,"marital_status":null,"current_role":"Store Incharge","desired_role":null,"current_company":"Secure Meters Ltd","location":"Agra, Uttar Pradesh","preferred_location":null,"total_experience":"7.75 years","current_salary":null,"expected_salary":null,"notice_period":null,"highest_qualification":"Graduation","degree":"BA","specialization":null,"university":"DBRAU Agra","education_year":"2010","education_percentage":null,"additional_qualifications":null,"technical_skills":"[\"Basic Computer\", \"MS Excel\"]","soft_skills":"[]","languages_known":"[\"Hindi\", \"English\"]","certifications":"[]","previous_companies":"[\"Secure Energy Services Pvt. Ltd.\", \"TATA MOTORS LTD.\", \"BSA Industry Agra\"]","job_titles":"[]","work_duration":"[]","key_achievements":"[]","projects":"[]","awards":"[]","publications":"[]","references":"[]","linkedin_profile":null,"portfolio_url":null,"github_profile":null,"summary":"To work in challenging environment and put my potential to the best use of fulfilling the organization’s goal and learning maximum in the process through consistent and work and determination retaining normal human value.","resume_text":"RESUME JAGESHWAR PRASAD Address : 11/32 C/16J Sita Nagar Rambagh Post Office - Yamuna Bridge Agra-06 Phone-7982532856,9997990364(Whatsapp) Email;-jprasad276@gmail.com Objective: To work in challenging environment and put my potential to the best use of fulfilling the organization’s goal and learning maximum in the process through consistent and work and determination retaining normal human value. Educational Qualification:  High school from UP Board in 2002  Intermediate Passed From UP Board in 2004  Graduation (BA) From DBRAU Agra in 2010 Professional Qualification:  ITI Turner Trade from Govt.ITI Agra in 2006 Work Experience:  2 Years Experience as a Store Incharge in Secure Meters Ltd . SEP 2022 to DEC 2024(SAMAST)  4 Year Experience as a Store Incharge in Secure Energy Services Pvt. Ltd.(IPDS)  9 Month as Job Trainee in TATA MOTORS LTD. Lucknow  One year apprenticeship in 2009 from BSA Industry Agra . Computer Qualification:  Basic Computer  MS Excel Personal Details: Father’s Name -Late. Shri Ram Swarup Mahaur Date of Birth -09/09/1985 Nationality -Indian Gender -Male Marital Status -Married Language known -Hindi,English Declaration: It is certify that all the information given above is true to the best of my knowledge and belief. DATE.................. PLACE................. (JAGESHWAR PRASAD)","file_name":"162614000001203176_JAGESHWAR PRASAD _Resume_Apna.pdf","file_url":"https://dmnypjxbfbjegraylspt.supabase.co/storage/v1/object/public/resume-files/e8aaf141-7f7b-4d22-8b07-cac4000d0ae3-02a4c8e28c.pdf","file_size":null,"file_type":null,"status":"new","tags":"[]","rating":null,"notes":null,"uploaded_at":"2025-11-22 17:51:10.715+00","updated_at":"2025-11-22 17:51:10.715+00","last_contacted":null,"interview_status":"not-scheduled","feedback":null,"parsing_method":"gemini","parsing_confidence":"0.95","parsing_errors":"[]","search_vector":"'-06':60 '-09':207 '-7982532856':62 '/09/1985':208 '11/32':50 '2':138 '2002':111 '2004':118 '2006':135 '2009':183 '2010':125 '2022':150 '2024':153 '4':155 '9':169 '9997990364':63 'address':49 'agra':8,59,123,133,187 'apprenticeship':181 'ba':120 'basic':190,244 'belief':239 'best':22,79,234 'birth':206 'board':109,116 'bridg':58 'bsa':185 'c/16j':51 'certifi':223 'challeng':14,71 'comput':188,191,245 'consist':37,94 'date':204,240 'dbrau':122 'dec':152 'declar':220 'detail':195 'determin':41,98 'educ':103 'email':65 'energi':164 'english':219,249 'environ':15,72 'excel':193,247 'experi':137,140,157 'father':196 'fulfil':25,82 'gender':211 'given':228 'goal':29,86 'govt.iti':132 'graduat':119 'high':105 'hindi':218,248 'human':44,101 'incharg':4,144,161 'indian':210 'industri':186 'inform':227 'intermedi':112 'ipd':168 'iti':128 'jageshwar':1,47,242 'job':172 'jprasad276@gmail.com':66 'knowledg':237 'known':217 'languag':216 'late':199 'learn':31,88 'ltd':7,148,167,177 'lucknow':178 'mahaur':203 'male':212 'marit':213 'marri':215 'maximum':32,89 'meter':6,147 'month':170 'motor':176 'ms':192,246 'nagar':53 'name':198 'nation':209 'normal':43,100 'object':67 'offic':56 'one':179 'organ':27,84 'pass':113 'person':194 'phone':61 'place':241 'post':55 'potenti':19,76 'pradesh':10 'prasad':2,48,243 'process':35,92 'profession':126 'put':17,74 'pvt':166 'qualif':104,127,189 'ram':201 'rambagh':54 'resum':46 'retain':42,99 'samast':154 'school':106 'secur':5,146,163 'sep':149 'servic':165 'shri':200 'sita':52 'status':214 'store':3,143,160 'swarup':202 'tata':175 'trade':130 'traine':173 'true':231 'turner':129 'use':23,80 'uttar':9 'valu':45,102 'whatsapp':64 'work':12,39,69,96,136 'yamuna':57 'year':139,156,180"}]"

this is the education row 
"[{"idx":0,"id":"0006fdc0-da28-4f97-81fe-266c5e548df1","candidate_id":"c76c3f8f-32b1-435d-b7b8-7b97b6584d64","degree":"Bachelor of Technology","specialization":"Electronics and Communication Engineering","institution":"Jawaharlal Nehru Technological University","year":"2021","percentage":"78%","description":null,"coursework":null,"projects":null,"achievements":null,"is_highest":false,"start_date":null,"end_date":null,"created_at":"2025-11-23 08:30:18.130647+00"}]"

this is expereince 
"[{"idx":0,"id":"00026426-719a-45b7-b5ee-f4f7cd62ef9e","candidate_id":"00c2431a-fc6d-4ff9-8c1a-8ca80d6d1582","company":"Udaan Logistics Pvt.Ltd.","role":"Hub Executive","duration":"3 years","location":null,"description":"","responsibilities":null,"achievements":null,"technologies":"[]","start_date":null,"end_date":null,"is_current":false,"created_at":"2025-11-23 09:32:42.947201+00"}]"

so with that make the error fix though the error is showing embedding error education expereince errror accroding to that fix that so that i can upload the resume 

