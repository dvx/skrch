#include "skrch.h"
#include "base64.h"

string skrch::urlDecode(string &SRC) {
	string ret;
	char ch;
	unsigned int i, ii;
	for (i=0; i<SRC.length(); i++) {
		if (int(SRC[i])==37) {
			sscanf(SRC.substr(i+1,2).c_str(), "%x", &ii);
			ch=static_cast<char>(ii);
			ret+=ch;
			i=i+2;
		} else {
			ret+=SRC[i];
		}
	}
	return (ret);
}

void skrch::AJAXHeaders(skrch_server::response &response) {
	// headers
	http::response_header_narrow server;
	server.name = "Server";
	server.value = "skrch/1.2 (Windows)";

	http::response_header_narrow access_control_allow_origin;
	access_control_allow_origin.name = "Access-Control-Allow-Origin";
	access_control_allow_origin.value = "*";

	http::response_header_narrow access_control_allow_methods;
	access_control_allow_methods.name = "Access-Control-Allow-Methods";
	access_control_allow_methods.value = "GET, POST, HEAD, OPTIONS";

	http::response_header_narrow access_control_allow_credentials;
	access_control_allow_credentials.name="Access-Control-Allow-Credentials";
	access_control_allow_credentials.value="true";

	http::response_header_narrow access_control_allow_headers;
	access_control_allow_headers.name="Access-Control-Allow-Headers";
	access_control_allow_headers.value="X-Requested-With, authorization";
	// end headers

	/* ajax headers*/
	response.headers.push_back(server);
	response.headers.push_back(access_control_allow_origin);
	response.headers.push_back(access_control_allow_methods);
	response.headers.push_back(access_control_allow_credentials);
	response.headers.push_back(access_control_allow_headers);
}

skrch::skrch() {
	std::cout << "skrch service online..." << std::endl;
	std::cout << "- populating db..." << std::endl ;

	// LOAD FROM DB.txt FILE (EXTERNAL IMAGES)
	if ( !boost::filesystem::exists( "db" ) ) {
		std::ifstream in;
		int n = 0;
		std::string full_path = boost::filesystem::current_path().string() + "/img_r/db.txt";
		in.open(full_path.c_str());

		while (in) {
			std::string url;
			std::getline(in, url);
			if(url.size() == 0)
				break;
			std::string img = url.substr(url.find_last_of("/") + 1);
			string path = boost::filesystem::current_path().string() + "/img_r/" + img;
			//cout << "url: " << url << std::endl;
			//cout << "img: " << img << std::endl;

			try {
				cv::Mat i = cv::imread(path);
				std::cout << "[ " << setw(5) << n << " ] generating HSV histogram for " << path << "." << std::endl;
				if (i.data != NULL)
					db.insert(t_strhistcannypair(url,
						t_histcannypair(getHSVhistFromImage(i, cv::Mat(), CV_BGR2HSV), getCannyFromImage(i))
					));
			} catch( cv::Exception& e ) {
				std::cout << "[ " << setw(5) << n << " ] cound not generate HSV histogram for " << path << "." << std::endl;
			}
			++n;
		}

		std::cout << "Creating serialized database for next time..." << std::endl;

		std::ofstream ofs("db", std::ios::binary);
		boost::archive::text_oarchive oa(ofs);
		oa << this->db;
		ofs.close();
	} else {
		std::ifstream ifs("db", std::ios::binary);
		boost::archive::text_iarchive ia(ifs);
		ia >> this->db;
		ifs.close();
	}
	std::cout << " done" << std::endl;
}

void skrch::operator()(const skrch_server::request &request, skrch_server::response &response) /*const*/ {

	t_strstrmap POSTdata;
	std::string ip = source(request);
	std::cerr << "[" << ip << "]: " << request.destination << " - " << skrch_server::response::ok << '\n';

	if (request.method == "POST")
		POSTdata = populatePOSTmap(request);

	if (POSTdata.find("needle") != POSTdata.end() && POSTdata.find("mask") != POSTdata.end()) {
		/* we have an image */
		std::string raw_img = base64_decode(urlDecode((*POSTdata.find("needle")).second));
		std::vector<char> buffer( raw_img.begin(), raw_img.end() );

		cv::Mat decoded_img;
		try {
			decoded_img = cv::imdecode(cv::Mat(buffer), 1);
		} catch( cv::Exception& e ) {
			response = skrch_server::response::stock_reply(skrch_server::response::ok, "{\"error\": \"" + e.msg + "\"}");
			AJAXHeaders(response);
			return;
		}

		std::string raw_mask_img = base64_decode(urlDecode((*POSTdata.find("mask")).second));
		std::vector<char> maskbuffer( raw_mask_img.begin(), raw_mask_img.end() );
		cv::Mat decoded_mask_img;

		try {
			decoded_mask_img = cv::imdecode(cv::Mat(maskbuffer), CV_LOAD_IMAGE_GRAYSCALE);
		} catch( cv::Exception& e ) {
			response = skrch_server::response::stock_reply(skrch_server::response::ok, "{\"error\": \"" + e.msg + "\"}");
			AJAXHeaders(response);
			return;
		}

		cv::Mat binary_mask = decoded_mask_img > 128;
		try {
			cv::MatND query_histogram = getHSVhistFromImage(decoded_img, binary_mask, CV_BGR2HSV, true);
			cv::Mat query_canny = getCannyFromImage(decoded_img, true);
			t_doublestrmap comparisons = getMatches(query_histogram, query_canny);
			response = skrch_server::response::stock_reply(skrch_server::response::ok, JSONifyMap(comparisons));
			query_histogram.release();
			query_canny.release();
		} catch ( cv::Exception& e ) {
			response = skrch_server::response::stock_reply(skrch_server::response::ok, "{\"error\": \"" + e.msg + "\"}");
			AJAXHeaders(response);
			return;
		}
	} else {
		response = skrch_server::response::stock_reply(skrch_server::response::ok, "{\"error\":\"data malformed\"}");
	}
	AJAXHeaders(response);
}

string skrch::JSONifyMap(t_doublestrmap map) {
	std::ostringstream o;

	map.erase(myadvance(map.begin(), std::min(size_t(200), map.size())), map.end());

	o << "{";
	for (t_doublestrmap::iterator it = map.begin(); it != map.end(); ++it) {
		o << (*it).first + 10 << " : \"" << (*it).second << "\"";
		if (it++ != map.end()) {
			o << ",";
			--it;
		}
	}
	o << "}";
	return o.str();
}

t_doublestrmap skrch::getMatches(cv::MatND hist, cv::Mat canny) {
	t_doublestrmap histcomp;
	for (t_strhistcannymap::iterator it = db.begin(); it != db.end(); ++it) {

		IplImage original = canny;
		IplImage comparator = (*it).second.second;

		double hist_comp = cv::compareHist(hist, (*it).second.first, CV_COMP_BHATTACHARYYA) * 10;
		if (hist_comp < 9.5) {
			float ratio = (*it).second.first.size().area() / (640 * 640);
			double contours_match = cvMatchShapes(&original, &comparator, CV_CONTOURS_MATCH_I1, 0) * 10;
			double weight = log10(hist_comp) + (log10(contours_match) * ratio);
			histcomp.insert(t_doublestrpair(weight, (*it).first));
		}
	}
	return histcomp;
}

t_strstrmap skrch::populatePOSTmap(const skrch_server::request &request) {
	t_strstrmap data;
	std::vector<std::string> strs;
	boost::split(strs, request.body, boost::is_any_of("\n&"));

	for(std::vector<std::string>::iterator it = strs.begin(); it!=strs.end(); ++it) {
		if ((*it).size() > 0) {
			data.insert(t_strstrpair((*it).substr(0, (*it).find('=')),      // from beginning to =
				(*it).substr((*it).find('=') + 1)));   // from = to the end
			//std::cerr << (*it).substr(0, (*it).find('=')) << "->" << urlDecode((*it).substr((*it).find('=') + 1)) << std::endl;
		}
	}
	return data;
}

void skrch::log(const char*c) {
	std::cout << c;
	// TODO: log stuff here
}

cv::Mat skrch::getCannyFromImage(cv::Mat src, bool uq) {
	cv::Mat temp, edges, grey;
	float ratio;
	const int maxval = 128;
	int newheight, newwidth;

	cv::resize(src, temp, cv::Size(src.size[1]/10, src.size[0]/10));

	grey.create(temp.size(), CV_8UC1);
	edges.create(temp.size(), CV_8UC1);

	cv::cvtColor(temp, grey, CV_BGR2GRAY);

	cv::Canny(grey, edges, 50, 150, 3, true);

	/*
	// TODO: maybe store these white binary values in a vector?
	int num = 0;
	for(int i=0;i<edges.rows;i++){
		for(int j=0;j<edges.cols;j++){
			//std::cout << static_cast<unsigned int>(edges.at<uchar>(i,j))<< ",";
			if (static_cast<unsigned int>(edges.at<uchar>(i,j)) != 0)
				++num;
		}
		//std::cout << "\n";
	}
	*/

	temp.release();
	src.release();
	grey.release();

	return edges;
}

cv::MatND skrch::getHSVhistFromImage(cv::Mat src, cv::Mat mask, int mode, bool uq) {
	// blur the image (helps with some canny recognition as well as histogram comparisons
	// only blur if it's not a user query
	if (!uq)
		cv::GaussianBlur(src, src, cv::Size(9,9), 8, 8);

	cv::Mat hsv;

	/* setting up the histogram */
	cv::cvtColor(src, hsv, mode);
	// let's quantize the hue to 30 levels
	// and the saturation to 32 levels
	int hbins = 30, sbins = 32;
	int histSize[] = {hbins, sbins};
	// hue varies from 0 to 179, see cvtColor
	float hranges[] = { 0, 360 };
	// saturation varies from 0 (black-gray-white) to
	// 255 (pure spectrum color)
	float sranges[] = { 0, 256 };
	const float* ranges[] = { hranges, sranges };
	cv::MatND hist;
	// we compute the histogram from the 0-th and 1-st channels
	int channels[] = {0, 1};

	// TODO: ADD A TRY CATCH HERE!!!
	// OpenCV Error: Assertion failed (mask.size() == imsize && mask.channels() == 1) in unknown function, file ..\..\..\..\ocv\opencv\modules\imgproc\src\histogram.cpp, line 157
	cv::calcHist(&hsv, 1, channels, mask, hist, 2, histSize, ranges, true, false);
	cv::normalize(hist, hist, 1.0);

	/* cleanup */
	hsv.release();

	return hist;
}
