#ifndef _SERIALIZE_H_
#define _SERIALIZE_H_

#include <cv.h>

namespace boost {
	namespace serialization {
		template<class Archive>
		void load(Archive & ar, cv::Mat & t, unsigned int version) {
			int height;
			int width;
			int type;
			int dims;
			int flags;

			ar & height;
			ar & width;
			ar & type;
			ar & dims;
			ar & flags;

			t.create(cv::Size(width, height), type);
			t.dims = dims;
			t.flags = flags;

			float *buffer = new float[height * width];
			ar & boost::serialization::make_array(buffer, height * width);

			t.convertTo(const_cast<cv::Mat&>(t), CV_32FC1);
			t.data = (unsigned char*)buffer;
			t.convertTo(const_cast<cv::Mat&>(t), type);
		}

		template<class Archive>
		void save(Archive & ar, const cv::Mat & t, unsigned int version) {
			int height = t.size().height;
			int width = t.size().width;
			int type = t.type();
			int dims = t.dims;
			int flags = t.flags;

			ar & height;
			ar & width;
			ar & type;
			ar & dims;
			ar & flags;

			t.convertTo(const_cast<cv::Mat&>(t), CV_32FC1);
			float* buffer = new float[height * width];
			int j = 0;
			for (uchar* i = t.datastart; i < t.dataend; i+=sizeof(uchar*)) {
				// TODO: this is a non-good way of doing this and will fail(?) on varying endianness
				buffer[j] = *reinterpret_cast<float*>(i);
				++j;
			}

			ar & boost::serialization::make_array(buffer, height * width);
			delete buffer;
		}
	}

}

#endif /*_SERIALIZE_H_*/

