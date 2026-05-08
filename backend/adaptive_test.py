# adaptive_test.py
import csv
import math
import random

class AdaptiveTest:
    def __init__(self, csv_file, max_items=18, sem_threshold=0.6):
        self.csv_file = csv_file
        self.max_items = max_items
        self.sem_threshold = sem_threshold

        self.item_db = None
        self.responses = []
        self.difficulties = []
        self.item_codes = []
        self.questions_asked = []

        self.theta = 0.0
        self.sem = 10.0
        self.current_question = None

    def load_items(self):
        with open(self.csv_file, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            coditem, b, item, key = [], [], [], []
            option1, option2, option3, option4 = [], [], [], []

            for row in reader:
                coditem.append(row["coditem"])
                b.append(float(row["b"]))
                item.append(row["item"])
                key.append(row["key"])
                option1.append(row["option1"])
                option2.append(row["option2"])
                option3.append(row["option3"])
                option4.append(row["option4"])

        self.item_db = {
            "coditem": coditem,
            "b": b,
            "item": item,
            "key": key,
            "option1": option1,
            "option2": option2,
            "option3": option3,
            "option4": option4,
        }

    def get_next_item(self):
        if not self.item_db or not self.item_db["b"]:
            return None

        differences = [abs(self.theta - b) for b in self.item_db["b"]]
        idx = differences.index(min(differences))

        next_item = {
            "coditem": self.item_db["coditem"].pop(idx),
            "text": self.item_db["item"].pop(idx),
            "key": self.item_db["key"].pop(idx),
            "b": self.item_db["b"].pop(idx),
            "option1": self.item_db["option1"].pop(idx),
            "option2": self.item_db["option2"].pop(idx),
            "option3": self.item_db["option3"].pop(idx),
            "option4": self.item_db["option4"].pop(idx),
        }

        self.current_question = next_item
        return next_item

    def submit_answer(self, user_answer: str):
        if not self.current_question:
            raise ValueError("No current question to answer")

        correct_key = self.current_question["key"]
        is_correct = (user_answer == correct_key)
        score = 1 if is_correct else 0

        self.responses.append(score)
        self.difficulties.append(self.current_question["b"])
        self.item_codes.append(self.current_question["coditem"])
        self.questions_asked.append(self.current_question)

        self.theta, self.sem = self.estimate_ability()

        submitted_question = self.current_question
        self.current_question = None

        return {
            "is_correct": is_correct,
            "theta": self.theta,
            "sem": self.sem,
            "submitted_question": submitted_question
        }

    def estimate_ability(self):
        if not self.responses:
            return 0.0, 10.0

        conv = 0.001
        J = len(self.responses)
        theta = self.theta
        delta = conv + 1

        th_max = max(self.difficulties) + 0.5 if self.difficulties else 2.0
        th_min = min(self.difficulties) - 0.5 if self.difficulties else -2.0

        if sum(self.responses) == J:
            return th_max, 0.3
        if sum(self.responses) == 0:
            return th_min, 0.3

        while abs(delta) > conv:
            sumnum = 0.0
            sumdem = 0.0
            for j in range(J):
                phat = 1 / (1 + math.exp(-(theta - self.difficulties[j])))
                sumnum += self.responses[j] - phat
                sumdem -= phat * (1 - phat)

            if sumdem == 0:
                break

            delta = sumnum / sumdem
            theta -= delta

        sem = 1 / math.sqrt(-sumdem) if sumdem < 0 else 10.0
        return theta, sem

    def should_stop(self):
        if len(self.responses) >= self.max_items:
            return True
        if self.sem < self.sem_threshold and len(self.responses) >= 7:
            return True
        return False

    def get_results(self):
        if not self.responses:
            return None

        standardized = round(((self.theta - 1.4) / 1.5) * 15 + 100)
        num_correct = sum(self.responses)
        accuracy = (num_correct / len(self.responses) * 100) if self.responses else 0

        # Only valid IRT-derived metrics
        parametric_values = {
            'accuracy': round(accuracy, 1),
        }

        return {
            'total_questions': len(self.responses),
            'correct_answers': num_correct,
            'accuracy': accuracy,
            'theta': round(self.theta, 3),
            'sem': round(self.sem, 3),
            'standardized_score': standardized,
            'responses': self.responses,
            'difficulties': self.difficulties,
            'item_codes': self.item_codes,
            'questions_asked': self.questions_asked,
            'parametric_values': parametric_values,
        }
