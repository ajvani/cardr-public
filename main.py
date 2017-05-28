import requests
import json

# Parsing data.json
def main(): 
	request = requests.get("https://bizzcard-d9c3c.firebaseio.com/.json?print=pretty&format=export")
	parsedJson = request.json()
	data = parsedJson['events']

	company = 'University of Maryland'
	result = []

	for event in data: 
		curr_event = data[event]
		for key in curr_event: 
			card = curr_event[key]
			if (card['company'] == company):
				result.append(card['name'])
				result.append(card['phone'])
				result.append(card['email'])
				break

	result = json.dumps(result)

main()