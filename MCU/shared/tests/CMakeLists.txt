add_executable(uns_mcu_tests
    tests_main.c)

target_link_libraries(uns_mcu_tests
    PRIVATE
        uns_mcu
        m)

add_test(NAME uns_mcu_tests COMMAND uns_mcu_tests)
