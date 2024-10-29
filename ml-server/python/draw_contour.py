import numpy as np
import cv2 as cv


class DrawContour:
    def __init__(self, canvas, contours, thickness, gap_width, segment_width, color):
        self.canvas = canvas
        self.contours = contours
        self.thickness = thickness
        self.gap_width = gap_width
        self.segment_width = segment_width
        self.color = color

    def draw_contour(self):
        contours_list = list(self.contours[0])
        drawing = True
        dist_left = self.segment_width

        for i, pt1 in enumerate(contours_list):
            if i == len(contours_list) - 1:
                break
            pt1 = pt1[0]
            pt2 = contours_list[i + 1][0]

            dist = np.linalg.norm(np.array(pt2) - np.array(pt1))

            while dist > 0:
                if dist < dist_left:
                    if drawing:
                        cv.line(self.canvas, tuple(pt1), tuple(pt2), self.color, self.thickness)
                    dist_left -= dist
                    break
                else:
                    new_point = self.find_point(np.array(pt1), np.array(pt2), dist_left)
                    if drawing:
                        cv.line(self.canvas, tuple(pt1), new_point, self.color, self.thickness)
                    pt1 = new_point
                    dist -= dist_left
                    drawing = not drawing
                    dist_left = self.gap_width if drawing else self.segment_width

        return self.canvas

    @staticmethod
    def find_point(pt1, pt2, dist):
        direction = np.array(pt2) - np.array(pt1)
        length = np.linalg.norm(direction)
        direction = direction / length

        # Calculate the new point at the specified distance from pt1
        new_point = pt1 + direction * dist
        new_point = new_point.astype(int)

        return tuple(new_point)
