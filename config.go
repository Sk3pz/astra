package main

import (
	"github.com/BurntSushi/toml"
	"log"
	"os"
)

type Config struct {
	Ip          string `toml:"ip"`
	Port        int    `toml:"port"`
	ReadBuffer  int    `toml:"ReadBuffer"`
	WriteBuffer int    `toml:"WriteBuffer"`
}

func ReadCfg(filePath string) (Config, error) {
	// ensure the directory ./config exists
	if _, err := os.Stat("./config"); os.IsNotExist(err) {
		err := os.Mkdir("./config", 0755)
		if err != nil {
			log.Println(err)
			return Config{}, nil
		}
	}

	// create the default config file if it doesn't exist
	if _, err := os.Stat(filePath); os.IsNotExist(err) {
		_, err := os.Create(filePath)
		if err != nil {
			return Config{}, err
		}
		err = os.WriteFile(filePath, []byte("ip = 'localhost'\nport = 8080\n"+
			"# Default: 1024\n"+
			"ReadBuffer = 1024\n"+
			"# Default: 1024\n"+
			"WriteBuffer = 1024"), 0644)
		if err != nil {
			return Config{}, err
		}
	}

	// read the config file file_path to a string
	bytes, err := os.ReadFile(filePath)
	if err != nil {
		return Config{}, err
	}

	var conf Config
	_, err = toml.Decode(string(bytes), &conf)
	if err != nil {
		return Config{}, err
	}

	return conf, nil
}
