#include "skrch.h"

int main(int argc, char * argv[]) {
	if (argc != 3) {
		std::cerr << "Usage: " << argv[0] << " address port" << std::endl;
		return 1;
	}
	try {
		skrch handler;
		skrch_server server(argv[1], argv[2], handler);
		boost::thread t1(boost::bind(&skrch_server::run, &server));
		boost::thread t2(boost::bind(&skrch_server::run, &server));
		server.run();
		t1.join();
		t2.join();
	}
	catch (std::exception &e) {
		std::cerr << e.what() << std::endl;
		return 1;
	}

	return 0;
}