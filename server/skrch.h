#ifndef _SKRCH_H_
#define _SKRCH_H_

#define _SECURE_SCL  0
#define _WIN32_WINNT 0x0501

#include <boost/network/protocol/http/server.hpp>
#include <boost/network/utils/thread_pool.hpp>
#include <boost/algorithm/string.hpp>
#include <boost/filesystem.hpp>

#include <boost/serialization/serialization.hpp>
#include <boost/serialization/map.hpp> 
#include <boost/serialization/array.hpp> 
#include <boost/archive/text_oarchive.hpp>
#include <boost/archive/text_iarchive.hpp>

#include <string>
#include <iostream>
#include <map>
#include <algorithm>
#include <iterator>
#include <fstream>

#include <cv.h>
#include <cxcore.h>
#include <highgui.h>

namespace http = boost::network::http;

struct skrch;
typedef boost::network::http::server<skrch> skrch_server;

typedef std::map<std::string, std::string> t_strstrmap;
typedef std::pair<std::string, std::string> t_strstrpair;

typedef std::pair<cv::MatND,cv::Mat> t_histcannypair;
typedef std::map<std::string, t_histcannypair> t_strhistcannymap;
typedef std::pair<std::string, t_histcannypair> t_strhistcannypair;

typedef std::map<double, std::string> t_doublestrmap;
typedef std::pair<double, std::string> t_doublestrpair;

struct skrch {
	friend class boost::serialization::access; 
	t_strhistcannymap db;

	// constructor
	skrch();

	// for boost
    void operator()(const skrch_server::request &request, skrch_server::response &response) /*const*/;
	void log(const char*c);

	// for http
	t_strstrmap populatePOSTmap(const skrch_server::request &request);
	string urlDecode(string &SRC);
	void AJAXHeaders(skrch_server::response &response);	// ajax-XHR headers

	// for the skrch engine
	cv::MatND getHSVhistFromImage(cv::Mat src, cv::Mat mask, int mode, bool uq = false);
	cv::Mat getCannyFromImage(cv::Mat src, bool uq = false);
	t_doublestrmap getMatches(cv::MatND hist, cv::Mat canny);
	string JSONifyMap(t_doublestrmap map);
};

/* BEGIN SERIALIZING cv::Mat */
#include "serialize.h"
BOOST_SERIALIZATION_SPLIT_FREE( cv::Mat )
BOOST_CLASS_TRACKING( cv::Mat, boost::serialization::track_never ) 
/* END SERIALIZING cv::Mat */

template<class It>
It myadvance(It it, size_t n) {
   std::advance(it, n);
   return it;
}

#endif /*_SKRCH_H_*/